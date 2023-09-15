import client from './client'

const getChatmessageFromChatflow = (id) => client.get(`/chatmessage/${id}`)

const deleteChatmessage = (id) => client.delete(`/chatmessage/${id}`)

export default {
    getChatmessageFromChatflow,
    deleteChatmessage
}
