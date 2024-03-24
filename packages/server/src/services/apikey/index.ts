import { getAPIKeys } from '../../utils/apiKey'
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

export default {
    getAllApiKeys
}
