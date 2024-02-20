import client from './client'

const getStatsFromChatflow = (id) => client.get(`/stats/${id}`)

export default {
    getStatsFromChatflow
}
