import { Client } from 'langchainhub'
import { parsePrompt } from '../../utils/hub'

const createPrompt = async (promptName: string): Promise<any> => {
    try {
        let hub = new Client()
        const prompt = await hub.pull(promptName)
        const templates = parsePrompt(prompt)
        const dbResponse = {
            status: 'OK',
            prompt: promptName,
            templates: templates
        }
        return dbResponse
    } catch (error) {
        throw new Error(`Error: loadPromptsService.createPrompt - ${error}`)
    }
}

export default {
    createPrompt
}
