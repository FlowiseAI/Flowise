import client from '@/api/client'

const getAllUsers = () => client.get('/custom/user-management')
const getUserById = (id) => client.get(`/custom/user-management/${id}`)
const createUser = (data) => client.post('/custom/user-management', data)
const updateUser = (id, data) => client.put(`/custom/user-management/${id}`, data)
const deleteUser = (id) => client.delete(`/custom/user-management/${id}`)

export default {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser
}
