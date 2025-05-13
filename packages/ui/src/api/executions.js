import client from './client'

const getAllExecutions = (params = {}) => client.get('/executions', { params })
const deleteExecutions = (executionIds) => client.delete('/executions', { data: { executionIds } })
const getExecutionById = (executionId) => client.get(`/executions/${executionId}`)
const getExecutionByIdPublic = (executionId) => client.get(`/public-executions/${executionId}`)
const updateExecution = (executionId, body) => client.put(`/executions/${executionId}`, body)

export default {
    getAllExecutions,
    deleteExecutions,
    getExecutionById,
    getExecutionByIdPublic,
    updateExecution
}
