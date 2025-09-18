import client from './client'

const upsertVectorStore = (id, input) => client.post(`/vector/internal-upsert/${id}`, input)
const upsertVectorStoreWithFormData = (id, formData) =>
    client.post(`/vector/internal-upsert/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    })
const getUpsertHistory = (id, params = {}) => client.get(`/upsert-history/${id}`, { params: { order: 'DESC', ...params } })
const deleteUpsertHistory = (ids) => client.patch(`/upsert-history`, { ids })

export default {
    getUpsertHistory,
    upsertVectorStore,
    upsertVectorStoreWithFormData,
    deleteUpsertHistory
}
