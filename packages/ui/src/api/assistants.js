import client from './client'

// OpenAI Assistant
const getAssistantObj = (id, credentialId) => client.get(`/openai-assistants/${id}?credential=${credentialId}`)

const getAllAvailableAssistants = (credentialId) => client.get(`/openai-assistants?credential=${credentialId}`)

// Assistant
const createNewAssistant = (body) => client.post(`/assistants`, body)

const getAllAssistants = (type) => client.get('/assistants?type=' + type)

const getSpecificAssistant = (id) => client.get(`/assistants/${id}`)

const updateAssistant = (id, body) => client.put(`/assistants/${id}`, body)

const deleteAssistant = (id, isDeleteBoth) =>
    isDeleteBoth ? client.delete(`/assistants/${id}?isDeleteBoth=true`) : client.delete(`/assistants/${id}`)

// Vector Store
const getAssistantVectorStore = (id, credentialId) => client.get(`/openai-assistants-vector-store/${id}?credential=${credentialId}`)

const listAssistantVectorStore = (credentialId) => client.get(`/openai-assistants-vector-store?credential=${credentialId}`)

const createAssistantVectorStore = (credentialId, body) => client.post(`/openai-assistants-vector-store?credential=${credentialId}`, body)

const updateAssistantVectorStore = (id, credentialId, body) =>
    client.put(`/openai-assistants-vector-store/${id}?credential=${credentialId}`, body)

const deleteAssistantVectorStore = (id, credentialId) => client.delete(`/openai-assistants-vector-store/${id}?credential=${credentialId}`)

// Vector Store Files
const uploadFilesToAssistantVectorStore = (id, credentialId, formData) =>
    client.post(`/openai-assistants-vector-store/${id}?credential=${credentialId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    })

const deleteFilesFromAssistantVectorStore = (id, credentialId, body) =>
    client.patch(`/openai-assistants-vector-store/${id}?credential=${credentialId}`, body)

// Files
const uploadFilesToAssistant = (credentialId, formData) =>
    client.post(`/openai-assistants-file/upload?credential=${credentialId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    })

const getChatModels = () => client.get('/assistants/components/chatmodels')
const getDocStores = () => client.get('/assistants/components/docstores')
const getTools = () => client.get('/assistants/components/tools')

const generateAssistantInstruction = (body) => client.post(`/assistants/generate/instruction`, body)

export default {
    getAllAssistants,
    getSpecificAssistant,
    getAssistantObj,
    getAllAvailableAssistants,
    createNewAssistant,
    updateAssistant,
    deleteAssistant,
    getAssistantVectorStore,
    listAssistantVectorStore,
    updateAssistantVectorStore,
    createAssistantVectorStore,
    uploadFilesToAssistant,
    uploadFilesToAssistantVectorStore,
    deleteFilesFromAssistantVectorStore,
    deleteAssistantVectorStore,
    getChatModels,
    getDocStores,
    getTools,
    generateAssistantInstruction
}
