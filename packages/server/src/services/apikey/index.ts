import { addAPIKey, getAPIKeys } from '../../utils/apiKey'
import { addChatflowsCount } from '../../utils/addChatflowsCount'

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

export default {
    createApiKey,
    getAllApiKeys
}
