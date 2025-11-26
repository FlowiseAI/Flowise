import client from './client'

const getAllFiles = () => client.get('/files')

const deleteFile = (path) => client.delete(`/files`, { params: { path } })

export default {
    getAllFiles,
    deleteFile
}
