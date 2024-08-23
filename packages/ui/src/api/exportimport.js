import client from './client'

const exportAll = () => client.get('/export-import/export/all')

export default {
    exportAll
}
