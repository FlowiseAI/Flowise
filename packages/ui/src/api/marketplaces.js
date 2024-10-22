import client from './client'

const getAllToolsMarketplaces = () => client.get('/marketplaces/tools')
const getAllTemplatesFromMarketplaces = () => client.get('/marketplaces/templates')
const getSpecificMarketplaceTemplate = (id) => client.get(`/marketplaces/templates/${id}`)

export default {
    getAllToolsMarketplaces,
    getAllTemplatesFromMarketplaces,
    getSpecificMarketplaceTemplate
}
