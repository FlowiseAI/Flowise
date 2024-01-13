import client from './client'

const getAllTemplateMarketplaces = () => client.get('/marketplaces/templates')
const getAllChatflowsMarketplaces = () => client.get('/marketplaces/chatflows')
const getAllToolsMarketplaces = () => client.get('/marketplaces/tools')

export default {
    getAllTemplateMarketplaces,
    getAllToolsMarketplaces,
    getAllChatflowsMarketplaces
}
