import client from './client'

const addFeedback = (id, body) => client.post(`/feedback/${id}`, body)
const updateFeedback = (id, body) => client.put(`/feedback/${id}`, body)

export default {
    addFeedback,
    updateFeedback
}
