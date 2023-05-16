import client from './client'

const getChatmessageFromChatflow = (id) => client.get(`/chatmessage/${id}`)

const createNewChatmessage = (id, body) => client.post(`/chatmessage/${id}`, body)

const deleteChatmessage = (id) => client.delete(`/chatmessage/${id}`)

// 使用axios上传文件
const uploadFile = (file) => {
    let formData = new FormData()
    formData.append('file', file)
    return client.post('/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    })
}

export default {
    getChatmessageFromChatflow,
    createNewChatmessage,
    deleteChatmessage,
    uploadFile
}
