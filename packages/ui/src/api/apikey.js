import client from './client'

const getAllAPIKeys = () => client.get('/apikey')

const createNewAPI = (body) => client.post(`/apikey`, body)

const updateAPI = (id, body) => client.put(`/apikey/${id}`, body)

const deleteAPI = (id) => client.delete(`/apikey/${id}`)

const importAPI = (body) => client.post(`/apikey/import`, body)

export default {
    getAllAPIKeys,
    createNewAPI,
    updateAPI,
    deleteAPI,
    importAPI
}
