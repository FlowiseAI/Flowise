import client from './client'

const getAllAssistants = () => client.get('/assistants')

const getSpecificAssistant = (id) => client.get(`/assistants/${id}`)

const getAssistantObj = (id, credential) => client.get(`/openai-assistants/${id}?credential=${credential}`)

const getAllAvailableAssistants = (credential) => client.get(`/openai-assistants?credential=${credential}`)

const createNewAssistant = (body) => client.post(`/assistants`, body)

const updateAssistant = (id, body) => client.put(`/assistants/${id}`, body)

const deleteAssistant = (id, isDeleteBoth) =>
    isDeleteBoth ? client.delete(`/assistants/${id}?isDeleteBoth=true`) : client.delete(`/assistants/${id}`)

export default {
    getAllAssistants,
    getSpecificAssistant,
    getAssistantObj,
    getAllAvailableAssistants,
    createNewAssistant,
    updateAssistant,
    deleteAssistant
}
