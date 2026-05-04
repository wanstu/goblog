// sync.js — 数据同步层
// 职责：
//   1. 根据在线/离线模式自动路由数据读写
//   2. 在线模式：API → 写入缓存 → 返回
//   3. 离线模式：缓存 → 返回 / 缓存 ← 写入
//   4. 合并冲突：导入数据或离线→在线切换时比较新旧版本
// 依赖：config.js, cache.js, request.js (通过 common.js 避免循环)

import config from '@/api/config.js'
import cache from '@/utils/cache.js'
import { get, post, put, del } from '@/utils/request.js'

// ============================================================
// ping — 检测后端是否可达
// ============================================================
async function ping() {
  try {
    const res = await get('/api/ping')
    return res.data && res.data.code === 0
  } catch (e) {
    return false
  }
}

// 尝试 ping 后端，失败则自动切换到离线模式
async function checkOnline() {
  const reachable = await ping()
  if (!reachable && config.isOnline()) {
    config.setMode(false) // 自动切换到离线
    console.log('后端不可达，自动切换到离线模式')
  }
  return reachable
}

// ============================================================
// 数据获取 — 自动判断在线/离线路由
// ============================================================

// 获取菜单列表（优先 API，失败或离线则走缓存）
async function fetchMenus() {
  if (config.isOnline()) {
    try {
      const res = await get('/api/menu/list')
      if (res.data && res.data.code === 0) {
        const menus = res.data.data || []
        await cache.setMenus(menus)           // 写入缓存
        config.markSynced()             // 记录同步时间
        return { menus, source: 'api' }
      }
    } catch (e) {
      console.warn('API 获取菜单失败，自动切换离线', e)
      config.setMode(false)
    }
  }
  // 离线模式或 API 失败 → 从缓存读取
  const menus = await cache.getMenus()
  return { menus: menus || [], source: 'cache' }
}

// ============================================================
// 数据写入 — 在线写 API+缓存，离线仅写缓存
// ============================================================
async function addMenu(data) {
  if (config.isOnline()) {
    try {
      const res = await post('/api/menu', data)
      if (res.data && res.data.code === 0) {
        // 写成功后重新拉取全量数据（保证缓存与服务端一致）
        return await fetchMenus()
      }
      return { success: false, error: res.data?.msg || '添加失败' }
    } catch (e) {
      if (await ping()) {
        return { success: false, error: '添加失败: ' + e.message }
      }
      config.setMode(false) // ping 失败则切离线
    }
  }
  // 离线模式或 API 失败 → 写入缓存
  const menus = await cache.getMenus() || []
  // 为离线新增的项添加标记和临时时间戳
  const newItem = { ...data, id: -(Date.now()), _offline: true, _updated: Date.now() }
  menus.push(newItem)
  await cache.setMenus(menus)
  return { menus, source: 'cache' }
}

async function updateMenu(id, data) {
  if (config.isOnline()) {
    try {
      const res = await put('/api/menu/' + id, data)
      if (res.data && res.data.code === 0) {
        return await fetchMenus()
      }
      return { success: false, error: res.data?.msg || '更新失败' }
    } catch (e) {
      if (await ping()) {
        return { success: false, error: '更新失败: ' + e.message }
      }
      config.setMode(false)
    }
  }
  // 离线模式 → 更新缓存中的对应项
  const menus = await cache.getMenus() || []
  const index = menus.findIndex(m => m.id === id)
  if (index !== -1) {
    menus[index] = { ...menus[index], ...data, _updated: Date.now() }
    await cache.setMenus(menus)
  }
  return { menus, source: 'cache' }
}

async function deleteMenu(id) {
  if (config.isOnline()) {
    try {
      const res = await del('/api/menu/' + id)
      if (res.data && res.data.code === 0) {
        return await fetchMenus()
      }
      return { success: false, error: res.data?.msg || '删除失败' }
    } catch (e) {
      if (await ping()) {
        return { success: false, error: '删除失败: ' + e.message }
      }
      config.setMode(false)
    }
  }
  // 离线模式 → 从缓存中移除
  const menus = await cache.getMenus() || []
  await cache.setMenus(menus.filter(m => m.id !== id))
  return { menus, source: 'cache' }
}

// ============================================================
// 手动刷新 — 从 API 强制拉取最新数据
// ============================================================
async function refreshFromAPI() {
  if (!config.isOnline()) {
    // 先检查是否已恢复在线
    const reachable = await ping()
    if (!reachable) return { success: false, error: '后端不可达，无法刷新' }
    // 后端恢复 → 执行离线→在线合并流程
    return await switchToOnline()
  }
  try {
    const res = await get('/api/menu/list')
    if (res.data && res.data.code === 0) {
      const apiMenus = res.data.data || []
      const localMenus = await cache.getMenus() || []
      // 合并 API 数据和本地数据
      const result = mergeData(apiMenus, localMenus)
      if (result.needsResolution) {
        return { success: false, conflicts: result.conflicts, apiMenus, localMenus }
      }
      await cache.setMenus(result.merged)
      config.markSynced()
      return { success: true, menus: result.merged, source: 'api' }
    }
    return { success: false, error: res.data?.msg || '刷新失败' }
  } catch (e) {
    return { success: false, error: '刷新失败: ' + e.message }
  }
}

// ============================================================
// 离线→在线切换 — 拉取在线+离线两份JSON → 合并 → 推送到API → 重新拉取 → 切换
// ============================================================
async function switchToOnline() {
  const reachable = await ping()
  if (!reachable) return { success: false, error: '后端不可达，无法切换到在线模式' }
  try {
    const apiMenus = await fetchAPIData()
    const localMenus = await cache.getMenus() || []
    const merged = mergeForOnline(localMenus, apiMenus)
    // 有冲突 → 返回让用户选择
    if (merged.conflicts.length > 0) {
      return { success: false, conflicts: merged.conflicts, apiMenus, localMenus }
    }
    // 无冲突 → 推送合并结果到 API → 重新拉取 → 保存 → 切换
    await pushToAPI(merged.result, apiMenus)
    const fresh = await fetchAPIData()
    await cache.setMenus(fresh)
    config.setMode(true)
    config.markSynced()
    return { success: true, menus: fresh, source: 'api' }
  } catch (e) {
    return { success: false, error: '切换在线模式失败: ' + e.message }
  }
}

// 从 API 拉取最新菜单列表
async function fetchAPIData() {
  const res = await get('/api/menu/list')
  if (!res.data || res.data.code !== 0) throw new Error('API 获取失败')
  return res.data.data || []
}

// 合并本地和在线数据 — 本地优先，返回 { result, conflicts }
function mergeForOnline(localMenus, apiMenus) {
  const conflicts = []
  const apiMap = {}; apiMenus.forEach(m => { apiMap[makeKey(m)] = m })
  const result = [...localMenus] // 本地为基准
  apiMenus.forEach(apiItem => {
    const key = makeKey(apiItem)
    const localIdx = result.findIndex(m => makeKey(m) === key)
    if (localIdx === -1) {
      result.push(apiItem) // API 独有 → 保留
    } else if (!isMenuEqual(result[localIdx], apiItem)) {
      conflicts.push({ key, local: result[localIdx], api: apiItem }) // 冲突
    }
  })
  return { result: conflicts.length === 0 ? result : [...apiMenus], conflicts }
}

// 将合并结果推送到 API：新项 POST，修改项 PUT（同 key 但数据不同）
async function pushToAPI(mergedMenus, apiMenus) {
  const apiKeyMap = {}; apiMenus.forEach(m => { apiKeyMap[makeKey(m)] = m })
  for (const item of mergedMenus) {
    const key = makeKey(item)
    const apiItem = apiKeyMap[key]
    const payload = { ...item }; delete payload._offline; delete payload._updated
    if (!apiItem) {
      // API 中不存在 → POST 创建
      delete payload.id // 新项不传 id
      try { await post('/api/menu', payload) } catch (e) { console.warn('POST失败:', key, e) }
    } else if (!isMenuEqual(item, apiItem) && apiItem.id > 0) {
      // 同 key 但数据不同（用户选择了本地版本）→ PUT 更新
      try { await put('/api/menu/' + apiItem.id, payload) } catch (e) { console.warn('PUT失败:', key, e) }
    }
  }
}

// 生成菜单项唯一标识 key
function makeKey(item) {
  if (item.id && item.id > 0) return 'id:' + item.id
  if (item.override && item.override > 0) return 'override:' + item.override
  return 'temp:' + (item.title || '') + '_' + (item.link || '')
}

// 比较两个菜单项关键字段是否相等
function isMenuEqual(a, b) {
  return a.title === b.title && a.color === b.color && a.cover_type === b.cover_type
    && a.cover_color === b.cover_color && a.cover_value === b.cover_value
    && a.link === b.link && a.desc === b.desc
}

// 应用用户选择的冲突解决方案 — 合并 → 推送到 API → 重新拉取 → 保存
async function applyResolutions(resolutions, apiMenus, localMenus) {
  const resolutionMap = new Map()
  resolutions.forEach(r => { resolutionMap.set(r.key, r.choose) })
  const result = [...localMenus]
  apiMenus.forEach(apiItem => {
    const key = makeKey(apiItem)
    const choice = resolutionMap.get(key)
    const localIdx = result.findIndex(m => makeKey(m) === key)
    if (choice === 'api' && localIdx !== -1) result[localIdx] = apiItem
    if (choice === 'api' && localIdx === -1) result.push(apiItem)
    if (!choice && localIdx === -1) result.push(apiItem) // API 独有
  })
  await pushToAPI(result, apiMenus)
  const fresh = await fetchAPIData()
  await cache.setMenus(fresh)
  config.setMode(true)
  config.markSynced()
  return { success: true, menus: fresh }
}

export default { ping, checkOnline, fetchMenus, addMenu, updateMenu, deleteMenu, refreshFromAPI, switchToOnline, applyResolutions, mergeForOnline, pushToAPI }
