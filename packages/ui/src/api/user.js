import client from './client'

const registerUser = (body) => client.post(`/user/register`, body)

const loginUser = (body) => client.post(`/user/login`, body)

const getUserById = (id) => client.get(`/user/${id}`)

const getAllGroupUsers = () => client.get(`/user/group-users`)

const addGroupUser = (body) => client.post(`/user/group-users/add`, body)

const deleteGroupUser = (idGroupname) => client.delete(`/user/group-users/delete?idGroupname=${idGroupname}`, { data: body })

const getUsersByGroup = (groupname) => client.get(`/user/group-users/group?groupname=${groupname}`)

const getAllUsersGroupedByGroupname = () => client.get(`/user/group-users/all`)

const removeUser = (id) => client.delete(`/user/remove-user?id=${id}`, body)

export default {
  getUserById,
  loginUser,
  registerUser,
  getAllGroupUsers,
  addGroupUser,
  deleteGroupUser,
  getUsersByGroup,
  getAllUsersGroupedByGroupname,
  removeUser
}
