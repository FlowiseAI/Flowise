import client from './client'

const ssoLogin = (providerName) => client.get(`/${providerName}/login`)

export default {
    ssoLogin
}
