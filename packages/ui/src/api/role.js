import client from './client'

const getAllRolesByOrganizationId = (organizationId) => client.get(`/role?organizationId=${organizationId}`)
const getRoleById = (id) => client.get(`/auth/roles/${id}`)
const createRole = (body) => client.post(`/role`, body)
const updateRole = (body) => client.put(`/role`, body)
const getRoleByName = (name) => client.get(`/auth/roles/name/${name}`)
const deleteRole = (id, organizationId) => client.delete(`/role?id=${id}&organizationId=${organizationId}`)

export default {
    getAllRolesByOrganizationId,
    getRoleById,
    createRole,
    updateRole,
    getRoleByName,
    deleteRole
}
