import client from './client'

const exportAll = () => client.get('/export-import/export/all')

const importAll = (body) => client.post('/export-import/import/all', body)

export default {
    exportAll,
    importAll
}
