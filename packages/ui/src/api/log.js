import client from './client'

const getLogs = (startDate, endDate) => client.get(`/logs?startDate=${startDate}&endDate=${endDate}`)

export default {
    getLogs
}
