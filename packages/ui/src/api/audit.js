import client from './client'

const fetchLoginActivity = (body) => client.post(`/audit/login-activity`, body)
const deleteLoginActivity = (body) => client.post(`/audit/login-activity/delete`, body)

export default {
    fetchLoginActivity,
    deleteLoginActivity
}
