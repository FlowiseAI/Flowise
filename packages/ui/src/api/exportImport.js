import client from './client'

const getAll = () => client.get('/export-import')

export default {
    getAll
}
