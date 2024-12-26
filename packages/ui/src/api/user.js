import client from './client'

const registerUser = (body) => client.post(`/user/register`, body)

const loginUser = (body) => client.post(`/user/login`, body)

const getUserById = (id) => client.get(`/user/${id}`)

export default {
  getUserById,
  loginUser,
  registerUser
}
