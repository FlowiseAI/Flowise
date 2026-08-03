import client from '@/api/client'

const inviteAccount = (body) => client.post(`/account/invite`, body)
const registerAccount = (body) => client.post(`/account/register`, body)
const verifyAccountEmail = (body) => client.post('/account/verify', body)
const confirmEmailChange = (body) => client.post('/account/confirm-email-change', body)
const resendVerificationEmail = (body) => client.post('/account/resend-verification', body)
const forgotPassword = (body) => client.post('/account/forgot-password', body)
const resetPassword = (body) => client.post('/account/reset-password', body)
const getBillingData = () => client.post('/account/billing')
const logout = () => client.post('/account/logout')
const deleteAccount = (body) => client.delete('/account/delete', { data: body })

export default {
    getBillingData,
    inviteAccount,
    registerAccount,
    verifyAccountEmail,
    confirmEmailChange,
    resendVerificationEmail,
    forgotPassword,
    resetPassword,
    logout,
    deleteAccount
}
