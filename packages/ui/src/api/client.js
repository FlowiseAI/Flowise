import axios from 'axios'
import * as Constants from '@/store/constant'

const apiClient = axios.create({
    baseURL: `${Constants.baseURL}/api/v1`,
    withCredentials: true,
    headers: {
        'Content-type': 'application/json'
    }
})

apiClient.interceptors.request.use(async function (config) {
    const baseURL = sessionStorage.getItem('baseURL') || Constants.baseURL // Fallback URL
    config.baseURL = `${baseURL}/api/v1`

    const token = sessionStorage.getItem('access_token')
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
})

export default apiClient
