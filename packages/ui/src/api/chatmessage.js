import client from './client'

const getChatmessageFromChatflow = (id, body) => client.get(`/chatmessage/${id}/${body}`)

const createNewChatmessage = (id, body) => client.post(`/chatmessage/${id}`, body)

const deleteChatmessage = (id) => client.delete(`/chatmessage/${id}`)

export default {
    getChatmessageFromChatflow,
    createNewChatmessage,
    deleteChatmessage
}
