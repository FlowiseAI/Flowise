import client from './client'

const getOrganizationById = (id) => client.get(`/organization?id=${id}`)

export default {
    getOrganizationById
}
