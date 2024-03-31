import client from './client'

const getStatsFromChatflow = (id, params) => client.get(`/stats/${id}`, { params: { ...params } })

export default {
    getStatsFromChatflow
}
