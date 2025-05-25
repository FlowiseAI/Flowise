import client from '@/api/client'

// TODO: use this endpoint but without the org id because org id will be null
const getLoginMethods = (organizationId) => client.get(`/loginmethod?organizationId=${organizationId}`)
// TODO: don't use this endpoint.
const getDefaultLoginMethods = () => client.get(`/loginmethod/default`)
const updateLoginMethods = (body) => client.put(`/loginmethod`, body)

const testLoginMethod = (body) => client.post(`/loginmethod/test`, body)

export default {
    getLoginMethods,
    updateLoginMethods,
    testLoginMethod,
    getDefaultLoginMethods
}
