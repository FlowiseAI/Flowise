import client from './client'

const exportData = (body) => client.post('/export-import/export', body)
const importData = (body) => client.post('/export-import/import', body)
const previewImportData = (body) => client.post('/export-import/preview', body)

export default {
    exportData,
    importData,
    previewImportData
}
