import client from './client'

const upsertVectorStore = (id, input) => client.post(`/vector/internal-upsert/${id}`, input)

export default {
    upsertVectorStore
}
