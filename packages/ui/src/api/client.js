import axios from 'axios'
import { baseURL } from '@/store/constant'

const dataLogin = localStorage.getItem('dataLogin') ? JSON?.parse(localStorage.getItem('dataLogin')) : {}
const accessToken = dataLogin?.accessToken || ''

export const apiClient = axios.create({
  baseURL: `${baseURL}/api/v1`,
  headers: {
    'Content-type': 'application/json',
    ...(accessToken && { Authorization: `Bearer ${accessToken}` })
  }
})

apiClient.interceptors.request.use(function (config) {
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.data && error.response.data.error === 'Unauthorized Access') {
      localStorage.removeItem('dataLogin')
      window.location.href = '/c-agent/'
    }
    return Promise.reject(error)
  }
)

export default apiClient
