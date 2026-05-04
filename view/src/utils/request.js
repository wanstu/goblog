// request.js — HTTP 请求工具层
// baseUrl 不再从构建时 .env 读取，而是运行时从 config 模块获取
// 这样可以在设置面板中动态修改 API 地址，无需重新构建

import config from '@/api/config.js'

const reqConfig = {
    expire: 60 * 1000,
}

// 动态获取 baseUrl（运行时从 localStorage 读取，兜底使用构建时环境变量）
function getBaseUrl() {
    return config.getApiUrl()
}

// 构建 GET 请求的查询字符串参数
function buildQuery(query = {}) {
    let queryStr = ''
    for (let key in query) {
        const value = query[key]
        if(queryStr !== '') {
            queryStr += '&'
        }
        queryStr += key + '=' + value
    }
    return queryStr
}

// GET 请求 — 将参数拼接到 URL 查询字符串
const get = (route, query = {}) => {
    return new Promise((resolve, reject) => {
        const url = getBaseUrl() + route + '?' + buildQuery(query)
        uni.request({
            url,
            method: 'GET',
            timeout: reqConfig.expire,
            success: (res) => {
                resolve(res)
            },
            fail: (res) => {
                reject(res)
            }
        })
    })
}

// POST 请求 — 发送 JSON 请求体，uni.request 自动序列化 data 对象
const post = (route, data = {}) => {
    return new Promise((resolve, reject) => {
        uni.request({
            url: getBaseUrl() + route,
            method: 'POST',
            data: data,             // uni.request 自动将对象序列化为 JSON
            header: {
                'Content-Type': 'application/json'
            },
            timeout: reqConfig.expire,
            success: (res) => resolve(res),
            fail: (res) => reject(res)
        })
    })
}

// PUT 请求 — 用于更新资源，发送 JSON 请求体
const put = (route, data = {}) => {
    return new Promise((resolve, reject) => {
        uni.request({
            url: getBaseUrl() + route,
            method: 'PUT',
            data: data,
            header: {
                'Content-Type': 'application/json'
            },
            timeout: reqConfig.expire,
            success: (res) => resolve(res),
            fail: (res) => reject(res)
        })
    })
}

// DELETE 请求 — 用于删除资源，通常不需要请求体
const del = (route) => {
    return new Promise((resolve, reject) => {
        uni.request({
            url: getBaseUrl() + route,
            method: 'DELETE',
            timeout: reqConfig.expire,
            success: (res) => resolve(res),
            fail: (res) => reject(res)
        })
    })
}

// UPLOAD 请求 — 上传文件（multipart/form-data）
// filePath: 要上传的文件临时路径
// formData: 额外的表单字段（可选）
const upload = (route, filePath, formData = {}) => {
    return new Promise((resolve, reject) => {
        uni.uploadFile({
            url: getBaseUrl() + route,
            filePath: filePath,      // 本地文件路径
            name: 'file',            // 后端接收的字段名（对应 FormFile("file")）
            formData: formData,      // 附加表单数据
            timeout: reqConfig.expire * 2, // 上传超时设为两倍
            success: (res) => {
                // uni.uploadFile 返回的 data 是字符串，需解析为 JSON
                if (typeof res.data === 'string') {
                    try {
                        res.data = JSON.parse(res.data)
                    } catch (e) {
                        console.warn('上传响应 JSON 解析失败', e)
                    }
                }
                resolve(res)
            },
            fail: (res) => reject(res)
        })
    })
}

const GET = get
export {
    get,
    GET,
    post,
    put,
    del,
    upload
}
