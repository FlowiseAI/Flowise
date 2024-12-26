import axios from 'axios'
import { baseURL } from '@/store/constant'

const dataLogin = localStorage.getItem('dataLogin') ? JSON?.parse(localStorage.getItem('dataLogin')) : {}
const accessToken = dataLogin?.accessToken || ''

const apiClient = axios.create({
  baseURL: `${baseURL}/api/v1`,
  headers: {
    'Content-type': 'application/json',
    'x-request-from': 'internal',
    ...(accessToken && { Authorization: `Bearer ${accessToken}` })
  }
})

apiClient.interceptors.request.use(function (config) {
  const username = localStorage.getItem('username')
  const password = localStorage.getItem('password')

  if (username && password) {
    config.auth = {
      username,
      password
    }
  }

  return config
})

export default apiClient
