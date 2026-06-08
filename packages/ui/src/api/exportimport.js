import client from './client'

const exportData = (body) => client.post('/export-import/export', body)
const importData = (body) => client.post('/export-import/import', body)
const exportChatflowMessages = (body) => client.post('/export-import/chatflow-messages', body)

export default {
    exportData,
    importData,
    exportChatflowMessages
}
