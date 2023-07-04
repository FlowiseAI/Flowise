import client from './client'

const getAllChatflowsMarketplaces = () => client.get('/marketplaces/chatflows')
const getAllToolsMarketplaces = () => client.get('/marketplaces/tools')

export default {
    getAllChatflowsMarketplaces,
    getAllToolsMarketplaces
}
