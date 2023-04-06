import client from './client'

const getAllChatflows = () => client.get('/chatflows')

const getSpecificChatflow = (id) => client.get(`/chatflows/${id}`)

const createNewChatflow = (body) => client.post(`/chatflows`, body)

const updateChatflow = (id, body) => client.put(`/chatflows/${id}`, body)

const deleteChatflow = (id) => client.delete(`/chatflows/${id}`)

export default {
    getAllChatflows,
    getSpecificChatflow,
    createNewChatflow,
    updateChatflow,
    deleteChatflow
}
