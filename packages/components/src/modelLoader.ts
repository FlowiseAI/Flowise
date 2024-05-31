import { INodeOptionsValue } from './Interface'
import axios from 'axios'
import * as fs from 'fs'
import * as path from 'path'

const MASTER_MODEL_LIST = 'https://raw.githubusercontent.com/FlowiseAI/Flowise/main/packages/components/models.json'

export enum MODEL_TYPE {
    CHAT = 'chat',
    LLM = 'llm',
    EMBEDDING = 'embedding'
}

const getModelsJSONPath = (): string => {
    const checkModelsPaths = [path.join(__dirname, '..', 'models.json'), path.join(__dirname, '..', '..', 'models.json')]
    for (const checkPath of checkModelsPaths) {
        if (fs.existsSync(checkPath)) {
            return checkPath
        }
    }
    return ''
}

const isValidUrl = (urlString: string) => {
    let url
    try {
        url = new URL(urlString)
    } catch (e) {
        return false
    }
    return url.protocol === 'http:' || url.protocol === 'https:'
}

const getModelConfig = async (category: MODEL_TYPE, name: string) => {
    const modelFile = process.env.MODEL_LIST_CONFIG_JSON || MASTER_MODEL_LIST

    if (!modelFile) {
        throw new Error('MODEL_LIST_CONFIG_JSON not set')
    }
    if (isValidUrl(modelFile)) {
        try {
            const resp = await axios.get(modelFile)
            if (resp.status === 200 && resp.data) {
                const models = resp.data
                const categoryModels = models[category]
                return categoryModels.find((model: INodeOptionsValue) => model.name === name)
            } else {
                throw new Error('Error fetching model list')
            }
        } catch (e) {
            const models = await fs.promises.readFile(getModelsJSONPath(), 'utf8')
            if (models) {
                const categoryModels = JSON.parse(models)[category]
                return categoryModels.find((model: INodeOptionsValue) => model.name === name)
            }
            return {}
        }
    } else {
        try {
            if (fs.existsSync(modelFile)) {
                const models = await fs.promises.readFile(modelFile, 'utf8')
                if (models) {
                    const categoryModels = JSON.parse(models)[category]
                    return categoryModels.find((model: INodeOptionsValue) => model.name === name)
                }
            }
            return {}
        } catch (e) {
            const models = await fs.promises.readFile(getModelsJSONPath(), 'utf8')
            if (models) {
                const categoryModels = JSON.parse(models)[category]
                return categoryModels.find((model: INodeOptionsValue) => model.name === name)
            }
            return {}
        }
    }
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
