import client from './client'

const upsertVectorStore = (id, input) => client.post(`/vector/internal-upsert/${id}`, input)
const getUpsertHistory = (id, params = {}) => client.get(`/upsert-history/${id}`, { params: { order: 'DESC', ...params } })
const deleteUpsertHistory = (ids) => client.patch(`/upsert-history`, { ids })

export default {
    getUpsertHistory,
    upsertVectorStore,
    deleteUpsertHistory
}
