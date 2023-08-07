import client from './client'

/*
  @params {filters: {"chatId": "a9djd2dj"}}
  @return []
*/
const getAllChainLogs = (params) => client.get('/chain-logs', params)

/**
 *
 * @param {data: {ids: string[]}} data
 * @returns
 */
const batchDeleteChainLogs = (data) => client.delete('/chain-logs', data)

export { getAllChainLogs, batchDeleteChainLogs }
