import client from './client'

const checkValidation = (id) => client.get(`/validation/${id}`)

export default {
    checkValidation
}
