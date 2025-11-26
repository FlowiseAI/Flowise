import client from './client'

const getAllWorkspacesByOrganizationId = (organizationId) => client.get(`/workspace?organizationId=${organizationId}`)

const getWorkspaceById = (id) => client.get(`/workspace?id=${id}`)

const unlinkUsers = (id, body) => client.post(`/workspace/unlink-users/${id}`, body)
const linkUsers = (id, body) => client.post(`/workspace/link-users/${id}`, body)

const switchWorkspace = (id) => client.post(`/workspace/switch?id=${id}`)

const createWorkspace = (body) => client.post(`/workspace`, body)
const updateWorkspace = (body) => client.put(`/workspace`, body)
const deleteWorkspace = (id) => client.delete(`/workspace/${id}`)

const getSharedWorkspacesForItem = (id) => client.get(`/workspace/shared/${id}`)
const setSharedWorkspacesForItem = (id, body) => client.post(`/workspace/shared/${id}`, body)

const updateWorkspaceUserRole = (body) => client.put(`/workspaceuser`, body)

export default {
    getAllWorkspacesByOrganizationId,
    getWorkspaceById,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    unlinkUsers,
    linkUsers,
    switchWorkspace,
    getSharedWorkspacesForItem,
    setSharedWorkspacesForItem,

    updateWorkspaceUserRole
}
