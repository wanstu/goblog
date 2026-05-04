// common.js — API 调用层（适配在线/离线模式）
// 所有菜单 CRUD 方法通过 sync.js 代理，自动判断在线/离线路由
// uploadImage 也通过 sync.js 处理（在线→上传服务器，离线→存 IndexedDB）

import { get, post, upload } from '../utils/request'
import sync from './sync.js'

export default {
    hello: (data) => get('/api/hello', data),

    // 获取菜单列表：在线→API+缓存，离线→缓存
    getMenuList: () => sync.fetchMenus().then(r => r.menus || []),

    // 新增菜单：在线→API+缓存，离线→缓存
    addMenu: (data) => sync.addMenu(data),

    // 更新菜单
    updateMenu: (id, data) => sync.updateMenu(id, data),

    // 删除菜单
    deleteMenu: (id) => sync.deleteMenu(id),

    // 上传图片：在线→上传服务器，离线→存本地
    uploadImage: (filePath) => upload('/api/upload', filePath),

    // 手动刷新：从 API 强制拉取
    refreshFromAPI: () => sync.refreshFromAPI(),

    // 切换到在线模式
    switchToOnline: () => sync.switchToOnline(),

    // 检查连通性
    ping: () => sync.ping(),

    // 抓取网站 favicon（在线时通过后端代理获取）
    fetchFavicon: (url) => post('/api/favicon', { url }),

    // 应用冲突解决方案
    applyResolutions: (resolutions, apiMenus, localMenus) => sync.applyResolutions(resolutions, apiMenus, localMenus),
}