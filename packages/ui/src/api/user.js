import client from './client'

const loginUser = (body) => client.post(`/user/login`, body)

const registerUser = (body) => client.post(`/admin/register`, body)

const getUserById = (id) => client.get(`/admin/${id}`)

const getAllGroupUsers = () => client.get(`/admin/group-users`)

const addGroupUser = (body) => client.post(`/admin/group-users/add`, body)

const deleteGroupUser = (idGroupname) => client.delete(`/admin/group-users/delete?idGroupname=${idGroupname}`)

const getUsersByGroup = (groupname) => client.get(`/admin/group-users/group?groupname=${groupname}`)

const getAllUsersGroupedByGroupname = () => client.get(`/admin/group-users/all`)

const removeUser = (id) => client.delete(`/admin/remove-user?id=${id}`)

const updateUser = (id, body) => client.patch(`/admin/update-user?id=${id}`, body)

export default {
  getUserById,
  loginUser,
  registerUser,
  getAllGroupUsers,
  addGroupUser,
  deleteGroupUser,
  getUsersByGroup,
  getAllUsersGroupedByGroupname,
  removeUser,
  updateUser
}
