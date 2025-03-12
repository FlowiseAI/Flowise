import client from './client'

const getAllToolsMarketplaces = () => client.get('/marketplaces/tools')
const getAllTemplatesFromMarketplaces = () => client.get('/marketplaces/templates')
const getSpecificMarketplaceTemplate = (id) => client.get(`/marketplaces/templates/${id}`)

const getAllCustomTemplates = () => client.get('/marketplaces/custom')
const saveAsCustomTemplate = (body) => client.post('/marketplaces/custom', body)
const deleteCustomTemplate = (id) => client.delete(`/marketplaces/custom/${id}`)

export default {
    getAllToolsMarketplaces,
    getAllTemplatesFromMarketplaces,
    getSpecificMarketplaceTemplate,
    getAllCustomTemplates,
    saveAsCustomTemplate,
    deleteCustomTemplate
}
