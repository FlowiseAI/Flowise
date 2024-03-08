import client from './client'

const upsertVectorStore = (id, input) => client.post(`/vector/internal-upsert/${id}`, input)
const getUpsertHistory = (id, params = {}) => client.get(`/vector/upsert/${id}`, { params: { order: 'DESC', ...params } })

export default {
    getUpsertHistory,
    upsertVectorStore
}
