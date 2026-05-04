// config.js — 配置管理模块（纯叶子，零外部依赖）
// 管理 API URL、在线/离线模式、强制离线标记等设置
// 仅 config 使用 localStorage；菜单/壁纸/图片数据由 cache.js 存入 IndexedDB

const CONFIG_KEY = 'goblog_config'

// 默认配置：应用首次启动或缓存被清除后使用
const DEFAULTS = {
  apiUrl: process.env.VITE_APP_API_URL || 'http://localhost:7000',
  onlineMode: true,        // 当前模式：true=在线, false=离线
  forcedOffline: false,    // 用户显式强制离线（刷页后仍保持离线）
  lastSyncTime: 0,         // 上次从 API 同步数据的时间戳（ms）
}

// 读取全部配置，与默认值合并（确保新增字段有默认值）
function getAll() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (!raw) return { ...DEFAULTS }
    const saved = JSON.parse(raw)
    return { ...DEFAULTS, ...saved } // 合并：用户保存的值优先，缺失字段用默认
  } catch (e) {
    console.warn('读取配置失败，使用默认值', e)
    return { ...DEFAULTS }
  }
}

// 保存全部配置到 localStorage
function saveAll(config) {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
  } catch (e) {
    console.error('保存配置失败', e)
  }
}

// 获取单个配置项
function get(key) {
  return getAll()[key]
}

// 设置单个配置项（读-改-写）
function set(key, value) {
  const config = getAll()
  config[key] = value
  saveAll(config)
}

// ---------- 便捷方法 ----------

// 获取当前 API 基础 URL
function getApiUrl() {
  return get('apiUrl')
}

// 设置 API 基础 URL
function setApiUrl(url) {
  set('apiUrl', url)
}

// 判断当前是否在线模式（在线 && 非强制离线）
function isOnline() {
  const cfg = getAll()
  return cfg.onlineMode && !cfg.forcedOffline
}

// 是否用户显式强制离线（刷新页面后保持离线）
function isForcedOffline() {
  return get('forcedOffline')
}

// 切换到在线模式：清除强制离线标记
function setMode(online) {
  set('onlineMode', online)
  if (online) {
    set('forcedOffline', false) // 在线时清除强制离线
  }
}

// 强制离线：设置标记并切换到离线（刷新后保持）
function forceOffline() {
  set('onlineMode', false)
  set('forcedOffline', true)
}

// 记录同步时间
function markSynced() {
  set('lastSyncTime', Date.now())
}

// 获取上次同步时间
function getLastSyncTime() {
  return get('lastSyncTime')
}

// 检查是否需要全量同步（例如从未同步过）
function needsFullSync() {
  return get('lastSyncTime') === 0
}

export default { getAll, saveAll, get, set, getApiUrl, setApiUrl, isOnline, isForcedOffline, setMode, forceOffline, markSynced, getLastSyncTime, needsFullSync, DEFAULTS }
