import axios from 'axios'
import { baseURL } from 'store/constant'
import { getAuthorizationConfig } from './cookies'

const apiClient = axios.create({
    baseURL: `${baseURL}/api/v1`,
    headers: {
        'Content-type': 'application/json'
    }
})

apiClient.interceptors.request.use(function (config) {
    return getAuthorizationConfig(config)
})

export default apiClient
