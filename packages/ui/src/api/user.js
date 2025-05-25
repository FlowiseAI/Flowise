import client from './client'

// users
const getUserById = (id) => client.get(`/user?id=${id}`)
const updateUser = (body) => client.put(`/user`, body)

// organization users
const getAllUsersByOrganizationId = (organizationId) => client.get(`/organizationuser?organizationId=${organizationId}`)
const getUserByUserIdOrganizationId = (organizationId, userId) =>
    client.get(`/organizationuser?organizationId=${organizationId}&userId=${userId}`)
const getOrganizationsByUserId = (userId) => client.get(`/organizationuser?userId=${userId}`)
const updateOrganizationUser = (body) => client.put(`/organizationuser`, body)
const deleteOrganizationUser = (organizationId, userId) =>
    client.delete(`/organizationuser?organizationId=${organizationId}&userId=${userId}`)

const getAdditionalSeatsQuantity = (subscriptionId) =>
    client.get(`/organization/additional-seats-quantity?subscriptionId=${subscriptionId}`)
const getCustomerDefaultSource = (customerId) => client.get(`/organization/customer-default-source?customerId=${customerId}`)
const getAdditionalSeatsProration = (subscriptionId, quantity) =>
    client.get(`/organization/additional-seats-proration?subscriptionId=${subscriptionId}&quantity=${quantity}`)
const updateAdditionalSeats = (subscriptionId, quantity, prorationDate) =>
    client.post(`/organization/update-additional-seats`, { subscriptionId, quantity, prorationDate })
const getPlanProration = (subscriptionId, newPlanId) =>
    client.get(`/organization/plan-proration?subscriptionId=${subscriptionId}&newPlanId=${newPlanId}`)
const updateSubscriptionPlan = (subscriptionId, newPlanId, prorationDate) =>
    client.post(`/organization/update-subscription-plan`, { subscriptionId, newPlanId, prorationDate })
const getCurrentUsage = () => client.get(`/organization/get-current-usage`)

// workspace users
const getAllUsersByWorkspaceId = (workspaceId) => client.get(`/workspaceuser?workspaceId=${workspaceId}`)
const getUserByRoleId = (roleId) => client.get(`/workspaceuser?roleId=${roleId}`)
const getUserByUserIdWorkspaceId = (userId, workspaceId) => client.get(`/workspaceuser?userId=${userId}&workspaceId=${workspaceId}`)
const getWorkspacesByUserId = (userId) => client.get(`/workspaceuser?userId=${userId}`)
const getWorkspacesByOrganizationIdUserId = (organizationId, userId) =>
    client.get(`/workspaceuser?organizationId=${organizationId}&userId=${userId}`)
const deleteWorkspaceUser = (workspaceId, userId) => client.delete(`/workspaceuser?workspaceId=${workspaceId}&userId=${userId}`)

export default {
    getUserById,
    updateUser,
    getAllUsersByOrganizationId,
    getUserByUserIdOrganizationId,
    getOrganizationsByUserId,
    getAllUsersByWorkspaceId,
    getUserByRoleId,
    getUserByUserIdWorkspaceId,
    getWorkspacesByUserId,
    getWorkspacesByOrganizationIdUserId,
    updateOrganizationUser,
    deleteWorkspaceUser,
    getAdditionalSeatsQuantity,
    getCustomerDefaultSource,
    getAdditionalSeatsProration,
    updateAdditionalSeats,
    getPlanProration,
    updateSubscriptionPlan,
    getCurrentUsage,
    deleteOrganizationUser
}
