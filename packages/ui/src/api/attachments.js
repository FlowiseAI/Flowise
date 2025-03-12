import client from './client'

const createAttachment = (chatflowid, chatid, formData) =>
    client.post(`/attachments/${chatflowid}/${chatid}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    })

export default {
    createAttachment
}
