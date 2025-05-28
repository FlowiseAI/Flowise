import client from './client'

const getAllEvaluators = () => client.get('/evaluators')

//evaluators
const createEvaluator = (body) => client.post(`/evaluators`, body)
const getEvaluator = (id) => client.get(`/evaluators/${id}`)
const updateEvaluator = (id, body) => client.put(`/evaluators/${id}`, body)
const deleteEvaluator = (id) => client.delete(`/evaluators/${id}`)

export default {
    getAllEvaluators,
    createEvaluator,
    getEvaluator,
    updateEvaluator,
    deleteEvaluator
}
