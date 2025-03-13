import client from './client'

const getAllExecutions = (params = {}) => client.get('/executions', { params })

export default {
    getAllExecutions
}
