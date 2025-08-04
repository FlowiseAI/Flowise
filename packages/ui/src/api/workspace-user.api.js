import client from './client'

const getWorkspaceByUserId = (userId) => client.get(`/workspaceuser?userId=${userId}`)
export default {
    getWorkspaceByUserId
}
