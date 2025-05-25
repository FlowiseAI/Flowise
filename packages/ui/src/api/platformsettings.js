import client from './client'

const getSettings = () => client.get('/settings')

export default {
    getSettings
}
