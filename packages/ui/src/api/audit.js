import client from './client'

const fetchLoginActivity = (body) => client.post(`/audit/login-activity`, body)

export default {
    fetchLoginActivity
}
