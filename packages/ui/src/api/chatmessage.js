import client from './client'

const getChatmessageFromChatflow = (id) => client.get(`/chatmessage/${id}`)

const createNewChatmessage = (id, body) => client.post(`/chatmessage/${id}`, body)

const updateChatmessage = (body) => client.put(`/chatmessage/`, body)

const deleteChatmessage = (id) => client.delete(`/chatmessage/${id}`)

export default {
    getChatmessageFromChatflow,
    createNewChatmessage,
    updateChatmessage,
    deleteChatmessage
}
