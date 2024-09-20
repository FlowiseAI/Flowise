import client from './client'

const exportData = (body) => client.post('/export-import/export', body)
const importData = (body) => client.post('/export-import/import', body)

export default {
    exportData,
    importData
}
