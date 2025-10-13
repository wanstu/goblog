import { get } from '../utils/request'

export default {
    hello: (data) => get('/api/hello', data)
}