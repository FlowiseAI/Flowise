import { Configuration, OpenAIApi } from 'openai'

const initializeOpenAI = () => {
    const configuration = new Configuration({
        apiKey: process.env.OPENAI_API_KEY
    })
    return new OpenAIApi(configuration)
}

export const openai = initializeOpenAI()
