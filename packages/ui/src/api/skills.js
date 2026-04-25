import client from './client'

const getAllSkills = (params) => client.get('/skills', { params })

const getSpecificSkill = (id) => client.get(`/skills/${id}`)

const createNewSkill = (body) => client.post(`/skills`, body)

const updateSkill = (id, body) => client.put(`/skills/${id}`, body)

const deleteSkill = (id) => client.delete(`/skills/${id}`)

export default {
    getAllSkills,
    getSpecificSkill,
    createNewSkill,
    updateSkill,
    deleteSkill
}
