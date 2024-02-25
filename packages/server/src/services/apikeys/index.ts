import { addAPIKey, deleteAPIKey, getApiKey, getAPIKeys, updateAPIKey } from '../../utils/apiKey'
import { addChatflowsCount } from '../../utils/addChatflowsCount'

const createApiKey = async (keyName: string) => {
    try {
        const keys = await addAPIKey(keyName)
        const dbResponse = await addChatflowsCount(keys)
        return dbResponse
    } catch (error) {
        throw new Error(`Error: apikeysService.createApiKey - ${error}`)
    }
}

const deleteApiKey = async (id: string) => {
    try {
        const keys = await deleteAPIKey(id)
        const dbResponse = await addChatflowsCount(keys)
        return dbResponse
    } catch (error) {
        throw new Error(`Error: apikeysService.deleteApiKey - ${error}`)
    }
}

//@ts-ignore
const getAllApiKeys = async () => {
    try {
        const keys = await getAPIKeys()
        const dbResponse = await addChatflowsCount(keys)
        return dbResponse
    } catch (error) {
        throw new Error(`Error: apikeysService.getAllApiKeys - ${error}`)
    }
}

const getSingleApiKey = async (apiKey: string) => {
    try {
        const dbResponse = await getApiKey(apiKey)
        return dbResponse
    } catch (error) {
        throw new Error(`Error: apikeysService.getSingleApiKey - ${error}`)
    }
}

const updateApiKey = async (id: string, keyName: string) => {
    try {
        const keys = await updateAPIKey(id, keyName)
        const dbResponse = await addChatflowsCount(keys)
        return dbResponse
    } catch (error) {
        throw new Error(`Error: apikeysService.updateApiKey - ${error}`)
    }
}

//@ts-ignore
const verifyApiKey = async (apiKey) => {
    try {
        const keyIsValid = await getApiKey(apiKey)
        if (!keyIsValid) {
            return {
                executionError: true,
                status: 401,
                msg: `Unauthorized`
            }
        } else {
            return {
                status: 200,
                msg: `OK`
            }
        }
    } catch (error: any) {
        throw new Error(`Error: apikeysService.updateApiKey - ${error?.message}`)
    }
}

export default {
    createApiKey,
    deleteApiKey,
    getAllApiKeys,
    getSingleApiKey,
    verifyApiKey,
    updateApiKey
}
