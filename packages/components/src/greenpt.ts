import axios from 'axios'
import { ICommonObject, INodeData, INodeOptionsValue } from './Interface'
import { getCredentialData, getCredentialParam } from './utils'

export const GREENPT_API_BASE_URL = 'https://api.greenpt.ai/v1'

export type GreenPTModelType = 'chat' | 'embedding' | 'rerank' | 'speech'

interface GreenPTModelsResponse {
    data?: Array<{ id?: unknown }>
}

const isModelType = (model: string, type: GreenPTModelType): boolean => {
    if (type === 'embedding') return model.toLowerCase().includes('embedding')
    if (type === 'rerank') return model.toLowerCase().includes('rerank')
    if (type === 'speech') return /^green-s(?:-|$)/i.test(model)
    return !model.toLowerCase().includes('embedding') && !model.toLowerCase().includes('rerank') && !/^green-s(?:-|$)/i.test(model)
}

export const filterGreenPTModels = (payload: GreenPTModelsResponse, type: GreenPTModelType): INodeOptionsValue[] => {
    if (!Array.isArray(payload?.data)) return []
    return payload.data
        .map((model) => model?.id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0 && isModelType(id, type))
        .map((id) => ({ label: id, name: id }))
}

export const listGreenPTModels = async (
    nodeData: INodeData,
    options: ICommonObject | undefined,
    type: GreenPTModelType
): Promise<INodeOptionsValue[]> => {
    if (!options) return []
    const credentialData = await getCredentialData(nodeData.credential ?? '', options)
    const apiKey = getCredentialParam('greenPTApiKey', credentialData, nodeData)
    const response = await axios.get<GreenPTModelsResponse>(`${GREENPT_API_BASE_URL}/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        timeout: 10_000
    })
    return filterGreenPTModels(response.data, type)
}

const booleanParam = (value: unknown): boolean | undefined => {
    if (value === true || value === 'true') return true
    if (value === false || value === 'false') return false
    return undefined
}

export const transcribeWithGreenPT = async (audio: Buffer, contentType: string, config: ICommonObject, apiKey: string): Promise<string> => {
    const params: ICommonObject = { model: (config.model as string) || 'green-s-pro' }
    if (config.language) params.language = config.language
    const punctuate = booleanParam(config.punctuate)
    const smartFormat = booleanParam(config.smartFormat)
    if (punctuate !== undefined) params.punctuate = punctuate
    if (smartFormat !== undefined) params.smart_format = smartFormat

    const response = await axios.post(`${GREENPT_API_BASE_URL}/listen`, audio, {
        headers: {
            Authorization: `Token ${apiKey}`,
            'Content-Type': /^[\w.+-]+\/[\w.+-]+$/.test(contentType) ? contentType : 'application/octet-stream'
        },
        params,
        timeout: 300_000
    })
    const transcript = response.data?.results?.channels?.[0]?.alternatives?.[0]?.transcript
    if (typeof transcript !== 'string' || !transcript.trim()) {
        throw new Error('GreenPT speech response contains no valid transcript')
    }
    return transcript.trim()
}
