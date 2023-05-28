import axios from 'axios'
import { baseURL } from 'store/constant'

const apiClient = axios.create({
    baseURL: `${baseURL}/api/v1`,
    headers: {
        'Content-type': 'application/json'
    }
})

export default apiClient
