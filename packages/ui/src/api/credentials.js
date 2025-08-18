import client from './client'

const getAllCredentials = () => client.get('/credentials')

const getCredentialsByName = (componentCredentialName) => client.get(`/credentials?credentialName=${componentCredentialName}`)

const getAllComponentsCredentials = () => client.get('/components-credentials')

const getSpecificCredential = (id) => client.get(`/credentials/${id}`)

const getSpecificComponentCredential = (name) => client.get(`/components-credentials/${name}`)

const createCredential = (body) => client.post(`/credentials`, body)

const updateCredential = (id, body) => client.put(`/credentials/${id}`, body)

const deleteCredential = (id) => client.delete(`/credentials/${id}`)

const refreshAccessToken = (body) => client.post(`/credentials/refresh-token`, body)

// Organization credentials management - use server-side admin routes
const getOrgCredentials = () => client.get('/admin/organizations/credentials')

const updateOrgCredentials = (integrations) => client.put('/admin/organizations/credentials', { integrations })

export default {
    getAllCredentials,
    getCredentialsByName,
    getAllComponentsCredentials,
    getSpecificCredential,
    getSpecificComponentCredential,
    createCredential,
    updateCredential,
    deleteCredential,
    refreshAccessToken,
    getOrgCredentials,
    updateOrgCredentials
}
