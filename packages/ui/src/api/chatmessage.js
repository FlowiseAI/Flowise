import client from './client'

const getInternalChatmessageFromChatflow = (id) => client.get(`/internal-chatmessage/${id}`)
const getAllChatmessageFromChatflow = (id, params = {}) => client.get(`/chatmessage/${id}`, { params: { order: 'DESC', ...params } })
const getChatmessageFromPK = (id, params = {}) => client.get(`/chatmessage/${id}`, { params: { order: 'ASC', ...params } })
const deleteChatmessage = (id, params = {}) => client.delete(`/chatmessage/${id}`, { params: { ...params } })

export default {
    getInternalChatmessageFromChatflow,
    getAllChatmessageFromChatflow,
    getChatmessageFromPK,
    deleteChatmessage
}
