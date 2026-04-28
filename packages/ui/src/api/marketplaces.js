import client from './client'

const getAllChatflowsMarketplaces = () => client.get('/marketplaces/chatflows')
const getAllToolsMarketplaces = () => client.get('/marketplaces/tools')
const getAllTemplatesFromMarketplaces = () => client.get('/marketplaces/templates')

const getAllCustomTemplates = () => client.get('/marketplaces/custom')
const saveAsCustomTemplate = (body) => client.post('/marketplaces/custom', body)
const deleteCustomTemplate = (id) => client.delete(`/marketplaces/custom/${id}`)

export default {
    getAllChatflowsMarketplaces,
    getAllToolsMarketplaces,
    getAllTemplatesFromMarketplaces,

    getAllCustomTemplates,
    saveAsCustomTemplate,
    deleteCustomTemplate
}
