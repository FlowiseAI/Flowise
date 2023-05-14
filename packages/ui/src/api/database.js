import client from './client'

const getExportDatabase = () => client.get('/database/export')
const createLoadDatabase = (body) => client.post('/database/load', body)

export default {
    getExportDatabase,
    createLoadDatabase
}
