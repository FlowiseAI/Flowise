import client from '@/api/client'

const inviteAccount = (body) => client.post(`/account/invite`, body)
const registerAccount = (body) => client.post(`/account/register`, body)
const verifyAccountEmail = (body) => client.post('/account/verify', body)
const resendVerificationEmail = (body) => client.post('/account/resend-verification', body)
const forgotPassword = (body) => client.post('/account/forgot-password', body)
const resetPassword = (body) => client.post('/account/reset-password', body)
const getBillingData = () => client.post('/account/billing')
const logout = () => client.post('/account/logout')

export default {
    getBillingData,
    inviteAccount,
    registerAccount,
    verifyAccountEmail,
    resendVerificationEmail,
    forgotPassword,
    resetPassword,
    logout
}
