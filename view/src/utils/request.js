const baseUrl = process.env.VITE_APP_API_URL
const config = {
    expire: 60 * 1000,
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
        const url = baseUrl + route + '?' + buildQuery(query)
        uni.request({
            url,
            method: 'GET',
            timeout: config.expire,
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
            url: baseUrl + route,
            method: 'POST',
            data: data,             // uni.request 自动将对象序列化为 JSON
            header: {
                'Content-Type': 'application/json'
            },
            timeout: config.expire,
            success: (res) => resolve(res),
            fail: (res) => reject(res)
        })
    })
}

// PUT 请求 — 用于更新资源，发送 JSON 请求体
const put = (route, data = {}) => {
    return new Promise((resolve, reject) => {
        uni.request({
            url: baseUrl + route,
            method: 'PUT',
            data: data,
            header: {
                'Content-Type': 'application/json'
            },
            timeout: config.expire,
            success: (res) => resolve(res),
            fail: (res) => reject(res)
        })
    })
}

// DELETE 请求 — 用于删除资源，通常不需要请求体
const del = (route) => {
    return new Promise((resolve, reject) => {
        uni.request({
            url: baseUrl + route,
            method: 'DELETE',
            timeout: config.expire,
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
            url: baseUrl + route,
            filePath: filePath,      // 本地文件路径
            name: 'file',            // 后端接收的字段名（对应 FormFile("file")）
            formData: formData,      // 附加表单数据
            timeout: config.expire * 2, // 上传超时设为两倍
            success: (res) => {
                // uni.uploadFile 返回的 data 是字符串，需解析为 JSON
                if (typeof res.data === 'string') {
                    try {
                        res.data = JSON.parse(res.data)
                    } catch (e) {
                        // 非 JSON 响应保持原样
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
