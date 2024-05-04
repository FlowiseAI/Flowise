import client from './client'

const getAllAPIKeys = () => client.get('/apikey')

const createNewAPI = (body) => client.post(`/apikey`, body)

const updateAPI = (id, body) => client.put(`/apikey/${id}`, body)

const deleteAPI = (id) => client.delete(`/apikey/${id}`)

export default {
    getAllAPIKeys,
    createNewAPI,
    updateAPI,
    deleteAPI
}
