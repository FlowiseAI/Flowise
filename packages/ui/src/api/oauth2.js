import client from './client'

const authorize = (credentialId) => client.post(`/oauth2-credential/authorize/${credentialId}`)

const refresh = (credentialId) => client.post(`/oauth2-credential/refresh/${credentialId}`)

const getCallback = (queryParams) => client.get(`/oauth2-credential/callback?${queryParams}`)

export default {
    authorize,
    refresh,
    getCallback
}
