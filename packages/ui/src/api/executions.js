import client from './client'

const getAllExecutions = (params = {}) => client.get('/executions', { params })
const deleteExecutions = (executionIds) => client.delete('/executions', { data: { executionIds } })

export default {
    getAllExecutions,
    deleteExecutions
}
