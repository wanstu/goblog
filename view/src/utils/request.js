const baseUrl = process.env.VITE_APP_API_URL
const config = {
    expire: 60 * 1000,
}

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

const GET = get
export {
    get,
    GET
}