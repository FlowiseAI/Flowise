import client from './client'

const getAllVariables = (params) => client.get('/variables', { params })

const createVariable = (body) => client.post(`/variables`, body)

const updateVariable = (id, body) => client.put(`/variables/${id}`, body)

const deleteVariable = (id) => client.delete(`/variables/${id}`)

export default {
    getAllVariables,
    createVariable,
    updateVariable,
    deleteVariable
}
