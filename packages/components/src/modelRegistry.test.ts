import models from '../models.json'

type ModelEntry = {
    label: string
    name: string
    input_cost: number
    output_cost: number
}

type ProviderEntry = {
    name: string
    models: ModelEntry[]
}

const getChatProvider = (name: string): ProviderEntry => {
    const provider = (models.chat as ProviderEntry[]).find((entry) => entry.name === name)
    if (!provider) throw new Error(`Missing chat provider ${name}`)
    return provider
}

describe('models.json Azure ChatOpenAI registry', () => {
    const newerGpt5Models = ['gpt-5.5', 'gpt-5.5-pro', 'gpt-5.4', 'gpt-5.4-pro', 'gpt-5.4-mini', 'gpt-5.4-nano']

    it.each(newerGpt5Models)('keeps %s Azure ChatOpenAI aligned with ChatOpenAI', (modelName) => {
        const chatOpenAI = getChatProvider('chatOpenAI')
        const azureChatOpenAI = getChatProvider('azureChatOpenAI')
        const openAIModel = chatOpenAI.models.find((model) => model.name === modelName)
        const azureModel = azureChatOpenAI.models.find((model) => model.name === modelName)

        expect(openAIModel).toBeDefined()
        expect(azureModel).toBeDefined()
        expect(azureModel).toEqual(openAIModel)
    })
})
