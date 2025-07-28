import client from './client'

// auth
const resolveLogin = (body) => client.post(`/auth/resolve`, body)
const login = (body) => client.post(`/auth/login`, body)

// permissions
const getAllPermissions = () => client.get(`/auth/permissions`)
const ssoSuccess = (token) => client.get(`/auth/sso-success?token=${token}`)

export default {
    resolveLogin,
    login,
    getAllPermissions,
    ssoSuccess
}
