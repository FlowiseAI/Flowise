import client from './client'

const getAllChainLogs = (params) => client.get('/chain-logs', params)

export { getAllChainLogs }
