import client from './client'

const getAllMarketplaces = () => client.get('/marketplaces')

export default {
    getAllMarketplaces
}
