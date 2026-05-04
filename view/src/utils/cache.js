// cache.js — 浏览器持久化存储层
// localStorage：仅 config.js 使用（API URL、模式标记）
// IndexedDB：菜单 JSON、壁纸 JSON、图片 Blob（大文件不用 localStorage）
// 依赖：config.js（仅读取，不写入配置）

import config from '@/api/config.js'
import compress from '@/utils/compress.js'

// ============================================================
// localStorage 旧数据 key（迁移用；迁移后删除）
// ============================================================
const LS_MENUS_KEY = 'goblog_menus'
const LS_WALLPAPERS_KEY = 'goblog_wallpapers'
const LS_IMAGES_KEY = 'goblog_images'

// ============================================================
// IndexedDB 部分
// ============================================================

const DB_NAME = 'goblog'
const DB_VERSION = 2            // v2: 新增 cache 对象仓库存 JSON 数据
const IMAGE_STORE = 'images'    // 图片 Blob（v1 已有）
const CACHE_STORE = 'cache'     // JSON 数据（menus、wallpapers）

// 打开/升级 IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(IMAGE_STORE)) {
        db.createObjectStore(IMAGE_STORE)
      }
      if (!db.objectStoreNames.contains(CACHE_STORE)) {
        db.createObjectStore(CACHE_STORE)
      }
    }
    req.onsuccess = (e) => resolve(e.target.result)
    req.onerror = (e) => reject(e.target.error)
  })
}

// --- IndexedDB 通用读写 ---
async function idbGet(storeName, key) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const req = tx.objectStore(storeName).get(key)
    req.onsuccess = () => resolve(req.result || null)
    req.onerror = (e) => reject(e.target.error)
  })
}
async function idbSet(storeName, key, value) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    tx.objectStore(storeName).put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = (e) => reject(e.target.error)
  })
}
async function idbDelete(storeName, key) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    tx.objectStore(storeName).delete(key)
    tx.oncomplete = () => resolve()
    tx.onerror = (e) => reject(e.target.error)
  })
}

// --- 图片 Blob 存储（v1 兼容） ---
async function saveImageBlob(key, blob) { await idbSet(IMAGE_STORE, key, blob) }
async function getImageBlob(key) { return await idbGet(IMAGE_STORE, key) }
async function deleteImageBlob(key) { await idbDelete(IMAGE_STORE, key) }
async function clearImageDB() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IMAGE_STORE, 'readwrite')
    tx.objectStore(IMAGE_STORE).clear()
    tx.oncomplete = () => resolve()
    tx.onerror = (e) => reject(e.target.error)
  })
}

// ============================================================
// 菜单数据 — IndexedDB 主存，localStorage 为兼容旧数据
// ============================================================

async function getMenus() {
  // 先从 IndexedDB 读
  try {
    const json = await idbGet(CACHE_STORE, 'menus')
    if (json) return JSON.parse(json)
  } catch (e) { console.warn('IDB 读菜单失败', e) }
  // 降级：从 localStorage 迁移旧数据
  try {
    const raw = localStorage.getItem(LS_MENUS_KEY)
    if (raw) { const menus = JSON.parse(raw); localStorage.removeItem(LS_MENUS_KEY); return menus }
  } catch (e) {}
  return null
}

async function setMenus(menus) {
  try {
    await idbSet(CACHE_STORE, 'menus', JSON.stringify(menus))
    config.markSynced()
  } catch (e) { console.error('保存菜单失败', e) }
}

// --- 壁纸数据 ---
async function getWallpapers() {
  try {
    const json = await idbGet(CACHE_STORE, 'wallpapers')
    if (json) return JSON.parse(json)
  } catch (e) {}
  try {
    const raw = localStorage.getItem(LS_WALLPAPERS_KEY)
    if (raw) { const wps = JSON.parse(raw); localStorage.removeItem(LS_WALLPAPERS_KEY); return wps }
  } catch (e) {}
  return null
}

async function setWallpapers(wallpapers) {
  try { await idbSet(CACHE_STORE, 'wallpapers', JSON.stringify(wallpapers)) }
  catch (e) { console.error('保存壁纸失败', e) }
}

// --- 图片映射（旧数据兼容） ---
function getImageMap() {
  try {
    const raw = localStorage.getItem(LS_IMAGES_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch (e) { return {} }
}
function setImageMap(map) {
  try { localStorage.setItem(LS_IMAGES_KEY, JSON.stringify(map)) }
  catch (e) { console.error('保存图片映射失败', e) }
}

// ============================================================
// 图片展示 URL — IDB 缓存优先，无缓存则在线 fetch 后存入 IDB（不存空值）
// key=完整图片 URL，离线无缓存时回退到原 URL
// ============================================================
async function getImageDisplayUrl(url) {
  if (!url) return ''
  if (url.startsWith('data:') || url.startsWith('blob:')) return url
  try { const blob = await getImageBlob(url); if (blob) return compress.blobToDataURL(blob) } catch (e) {}
  if (config.isOnline()) {
    try {
      const resp = await fetch(url)
      if (resp.ok) { const blob = await resp.blob(); await saveImageBlob(url, blob); return compress.blobToDataURL(blob) }
    } catch (e) {}
  }
  return url
}

// --- 离线图片上传 ---
async function saveOfflineImage(filePath, fileName) {
  const dataUrl = await compress.compressToBase64(filePath, 600, 600, 0.7)
  const blob = compress.dataURLToBlob(dataUrl)
  await saveImageBlob(fileName, blob)
  const map = getImageMap()
  map[fileName] = dataUrl
  setImageMap(map)
  return fileName
}

async function getImageUrl(fileName, originalUrl) {
  if (config.isOnline() && originalUrl) return originalUrl
  try { const blob = await getImageBlob(fileName); if (blob) return compress.blobToDataURL(blob) } catch (e) {}
  const map = getImageMap()
  if (map[fileName]) return map[fileName]
  return originalUrl || ''
}

// ============================================================
// 存储用量（localStorage + IndexedDB 估算）
// ============================================================
function getStorageUsage() {
  let used = 0
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith('goblog_')) used += (localStorage.getItem(key) || '').length * 2
  }
  return { used, limit: 5 * 1024 * 1024, percent: Math.round(used / (5 * 1024 * 1024) * 100) }
}

// ============================================================
// 导出 / 导入
// ============================================================
async function exportAll() {
  const exportData = {
    version: 3,
    exportedAt: Date.now(),
    config: config.getAll(),
    menus: (await getMenus()) || [],
    wallpapers: (await getWallpapers()) || [],
    images: getImageMap(),
  }
  return JSON.stringify(exportData, null, 2)
}

async function importAll(jsonStr) {
  try {
    const data = JSON.parse(jsonStr)
    if (!data || data.version < 1) return { success: false, error: '无效的备份文件格式' }
    if (data.menus && Array.isArray(data.menus)) await setMenus(data.menus)
    if (data.wallpapers && Array.isArray(data.wallpapers)) await setWallpapers(data.wallpapers)
    if (data.images && typeof data.images === 'object') setImageMap(data.images)
    return { success: true, menus: data.menus || [], wallpapers: data.wallpapers || [] }
  } catch (e) { return { success: false, error: '解析备份文件失败: ' + e.message } }
}

async function clearAll() {
  await idbDelete(CACHE_STORE, 'menus')
  await idbDelete(CACHE_STORE, 'wallpapers')
  localStorage.removeItem(LS_MENUS_KEY)
  localStorage.removeItem(LS_WALLPAPERS_KEY)
  localStorage.removeItem(LS_IMAGES_KEY)
  await clearImageDB()
}

export default { getMenus, setMenus, getWallpapers, setWallpapers, getStorageUsage, saveOfflineImage, getImageUrl, getImageDisplayUrl, saveImageBlob, getImageBlob, deleteImageBlob, clearImageDB, exportAll, importAll, clearAll, getImageMap, setImageMap }
