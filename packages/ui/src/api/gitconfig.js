import client from './client'

const getAllGitConfigs = () => client.get('/git-config')

const getGitConfigById = (id) => client.get(`/git-config/${id}`)

const createGitConfig = (body) => client.post('/git-config', body)

const updateGitConfig = (id, body) => client.put(`/git-config/${id}`, body)

const deleteGitConfig = (id) => client.delete(`/git-config/${id}`)

const activateGitConfig = (id) => client.post(`/git-config/${id}/activate`)

const testGitConfig = (body) => client.post(`/git-config/test`, body)

export default {
    getAllGitConfigs,
    getGitConfigById,
    createGitConfig,
    updateGitConfig,
    deleteGitConfig,
    activateGitConfig,
    testGitConfig,
} 