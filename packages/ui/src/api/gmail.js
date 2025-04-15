import axios from 'axios'
import { baseURL } from '@/store/constant'

const getLabels = (payload) => {
    return axios.post(`${baseURL}/api/v1/gmail/labels`, payload)
}

const getMessagesByLabel = (payload) => {
    return axios.post(`${baseURL}/api/v1/gmail/messages`, payload)
}

const getMessage = (payload) => {
    return axios.post(`${baseURL}/api/v1/gmail/message`, payload)
}

export default {
    getLabels,
    getMessagesByLabel,
    getMessage
}
