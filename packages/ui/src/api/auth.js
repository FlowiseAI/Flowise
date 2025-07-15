import client from './client'

const getMe = () => client.get('/auth/me')

export default {
    getMe
}
