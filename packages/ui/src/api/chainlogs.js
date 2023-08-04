import client from './client'

const getAllChainLogs = (params) => client.get('/chain-logs', params)

/**
 *
 * @param {data: {ids: string[]}} data
 * @returns
 */
const batchDeleteChainLogs = (data) => client.delete('/chain-logs', data)

export { getAllChainLogs, batchDeleteChainLogs }
