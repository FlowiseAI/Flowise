import { addAPIKey, deleteAPIKey, getAPIKeys, updateAPIKey } from '../../utils/apiKey'
import { addChatflowsCount } from '../../utils/addChatflowsCount'
import { getApiKey } from '../../utils/apiKey'

const getAllApiKeys = async () => {
    try {
        const keys = await getAPIKeys()
        const dbResponse = await addChatflowsCount(keys)
        return dbResponse
    } catch (error) {
        throw new Error(`Error: apikeyService.getAllApiKeys - ${error}`)
    }
}

const createApiKey = async (keyName: string) => {
    try {
        const keys = await addAPIKey(keyName)
        const dbResponse = await addChatflowsCount(keys)
        return dbResponse
    } catch (error) {
        throw new Error(`Error: apikeyService.createApiKey - ${error}`)
    }
}

// Update api key
const updateApiKey = async (id: string, keyName: string) => {
    try {
        const keys = await updateAPIKey(id, keyName)
        const dbResponse = await addChatflowsCount(keys)
        return dbResponse
    } catch (error) {
        throw new Error(`Error: apikeyService.updateApiKey - ${error}`)
    }
}

const deleteApiKey = async (id: string) => {
    try {
        const keys = await deleteAPIKey(id)
        const dbResponse = await addChatflowsCount(keys)
        return dbResponse
    } catch (error) {
        throw new Error(`Error: apikeyService.deleteApiKey - ${error}`)
    }
}

const verifyApiKey = async (paramApiKey: string): Promise<any> => {
    try {
        const apiKey = await getApiKey(paramApiKey)
        if (!apiKey) {
            return {
                executionError: true,
                status: 401,
                msg: `Unauthorized`
            }
        }
        const dbResponse = 'OK'
        return dbResponse
    } catch (error) {
        throw new Error(`Error: apikeyService.verifyApiKey - ${error}`)
    }
}

export default {
    createApiKey,
    deleteApiKey,
    getAllApiKeys,
    updateApiKey,
    verifyApiKey
}
