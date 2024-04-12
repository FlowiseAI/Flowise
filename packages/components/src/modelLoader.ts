import { INodeOptionsValue } from './Interface'
import axios from 'axios'

const MASTER_MODEL_LIST = 'https://raw.githubusercontent.com/FlowiseAI/Flowise/main/packages/components/models.json'

export enum MODEL_TYPE {
    CHAT = 'chat',
    LLM = 'llm',
    EMBEDDING = 'embedding'
}

const getModelConfig = async (category: MODEL_TYPE, name: string) => {
    const modelFile = process.env.MODEL_LIST_CONFIG_JSON || MASTER_MODEL_LIST
    if (!modelFile) {
        throw new Error('MODEL_LIST_CONFIG_JSON not set')
    }
    const resp = await axios.get(modelFile)
    const models = resp.data
    const categoryModels = models[category]
    return categoryModels.find((model: any) => model.name === name)
}

export const getModels = async (category: MODEL_TYPE, name: string) => {
    const returnData: INodeOptionsValue[] = []
    try {
        const modelConfig = await getModelConfig(category, name)
        returnData.push(...modelConfig.models)
        return returnData
    } catch (e) {
        throw new Error(`Error: getModels - ${e}`)
    }
}

export const getRegions = async (category: MODEL_TYPE, name: string) => {
    const returnData: INodeOptionsValue[] = []
    try {
        const modelConfig = await getModelConfig(category, name)
        returnData.push(...modelConfig.regions)
        return returnData
    } catch (e) {
        throw new Error(`Error: getRegions - ${e}`)
    }
}
