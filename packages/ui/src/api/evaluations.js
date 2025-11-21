import client from './client'

//evaluation
const getAllEvaluations = (params) => client.get('/evaluations', { params })
const getIsOutdated = (id) => client.get(`/evaluations/is-outdated/${id}`)
const getEvaluation = (id) => client.get(`/evaluations/${id}`)
const createEvaluation = (body) => client.post(`/evaluations`, body)
const deleteEvaluation = (id) => client.delete(`/evaluations/${id}`)
const runAgain = (id) => client.post(`/evaluations/run-again/${id}`)
const getVersions = (id) => client.get(`/evaluations/versions/${id}`)
const deleteEvaluations = (ids, isDeleteAllVersion) => client.patch(`/evaluations`, { ids, isDeleteAllVersion })

export default {
    createEvaluation,
    deleteEvaluation,
    getAllEvaluations,
    getEvaluation,
    getIsOutdated,
    runAgain,
    getVersions,
    deleteEvaluations
}
