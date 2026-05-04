import { get, post, put, del, upload } from '../utils/request'

export default {
    hello: (data) => get('/api/hello', data),

    // 获取菜单列表（硬编码 + 数据库合并数据）
    getMenuList: () => get('/api/menu/list'),

    // 新增自定义菜单项
    addMenu: (data) => post('/api/menu', data),

    // 更新指定 ID 的菜单项
    updateMenu: (id, data) => put('/api/menu/' + id, data),

    // 删除指定 ID 的菜单项
    deleteMenu: (id) => del('/api/menu/' + id),

    // 上传图片文件，返回服务器存储的 URL
    uploadImage: (filePath) => upload('/api/upload', filePath)
}