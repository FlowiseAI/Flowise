import { GooglePaLM, GooglePaLMTextInput } from '@langchain/community/llms/googlepalm'
import { BaseCache } from '@langchain/core/caches'
import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { getModels, MODEL_TYPE } from '../../../src/modelLoader'

class GooglePaLM_LLMs implements INode {
    label: string
    name: string
    version: number
    type: string
    icon: string
    category: string
    description: string
    baseClasses: string[]
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'GooglePaLM'
        this.name = 'GooglePaLM'
        this.version = 3.0
        this.type = 'GooglePaLM'
        this.icon = 'GooglePaLM.svg'
        this.category = 'LLMs'
        this.description = 'Wrapper around Google MakerSuite PaLM large language models'
        this.baseClasses = [this.type, ...getBaseClasses(GooglePaLM)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['googleMakerSuite']
        }
        this.inputs = [
            {
                label: 'Cache',
                name: 'cache',
                type: 'BaseCache',
                optional: true
            },
            {
                label: 'Model Name',
                name: 'modelName',
                type: 'asyncOptions',
                loadMethod: 'listModels',
                default: 'models/text-bison-001'
            },
            {
                label: 'Temperature',
                name: 'temperature',
                type: 'number',
                step: 0.1,
                default: 0.7,
                optional: true,
                description:
                    'Controls the randomness of the output.\n' +
                    'Values can range from [0.0,1.0], inclusive. A value closer to 1.0 ' +
                    'will produce responses that are more varied and creative, while ' +
                    'a value closer to 0.0 will typically result in more straightforward ' +
                    'responses from the model.'
            },
            {
                label: 'Max Output Tokens',
                name: 'maxOutputTokens',
                type: 'number',
                step: 1,
                optional: true,
                additionalParams: true,
                description: 'Maximum number of tokens to generate in the completion.'
            },
            {
                label: 'Top Probability',
                name: 'topP',
                type: 'number',
                step: 0.1,
                optional: true,
                additionalParams: true,
                description:
                    'Top-p changes how the model selects tokens for output.\n' +
                    'Tokens are selected from most probable to least until ' +
                    'the sum of their probabilities equals the top-p value.\n' +
                    'For example, if tokens A, B, and C have a probability of .3, .2, and .1 ' +
                    'and the top-p value is .5, then the model will select either A or B ' +
                    'as the next token (using temperature).'
            },
            {
                label: 'Top-k',
                name: 'topK',
                type: 'number',
                step: 1,
                optional: true,
                additionalParams: true,
                description:
                    'Top-k changes how the model selects tokens for output.\n' +
                    'A top-k of 1 means the selected token is the most probable among ' +
                    'all tokens in the model vocabulary (also called greedy decoding), ' +
                    'while a top-k of 3 means that the next token is selected from ' +
                    'among the 3 most probable tokens (using temperature).'
            },
            {
                label: 'Stop Sequences',
                name: 'stopSequencesObj',
                type: 'json',
                optional: true,
                additionalParams: true
                //default: { list:[] },
                //description:
                //  'The "list" field should contain a list of character strings (up to 5) that will stop output generation.\n' +
                //  '  * If specified, the API will stop at the first appearance of a stop sequence.\n' +
                //  'Note: The stop sequence will not be included as part of the response.'
            }
            /*
            {
                label: 'Safety Settings',
                name: 'safetySettings',
                type: 'json',
                optional: true,
                additionalParams: true
            } 
            */
        ]
    }

    //@ts-ignore
    loadMethods = {
        async listModels(): Promise<INodeOptionsValue[]> {
            return await getModels(MODEL_TYPE.LLM, 'GooglePaLM')
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const modelName = nodeData.inputs?.modelName as string
        const temperature = nodeData.inputs?.temperature as string
        const maxOutputTokens = nodeData.inputs?.maxOutputTokens as string
        const topP = nodeData.inputs?.topP as string
        const topK = nodeData.inputs?.topK as string
        const stopSequencesObj = nodeData.inputs?.stopSequencesObj
        const cache = nodeData.inputs?.cache as BaseCache

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const googleMakerSuiteKey = getCredentialParam('googleMakerSuiteKey', credentialData, nodeData)

        const obj: Partial<GooglePaLMTextInput> = {
            modelName: modelName,
            temperature: parseFloat(temperature),
            apiKey: googleMakerSuiteKey
        }

        if (maxOutputTokens) obj.maxOutputTokens = parseInt(maxOutputTokens, 10)
        if (topP) obj.topP = parseFloat(topP)
        if (topK) obj.topK = parseFloat(topK)
        if (cache) obj.cache = cache

        let parsedStopSequences: any | undefined = undefined
        if (stopSequencesObj) {
            try {
                parsedStopSequences = typeof stopSequencesObj === 'object' ? stopSequencesObj : JSON.parse(stopSequencesObj)
                obj.stopSequences = parsedStopSequences.list || []
            } catch (exception) {
                throw new Error("Invalid JSON in the GooglePaLM's stopSequences: " + exception)
            }
        }

        const model = new GooglePaLM(obj)
        return model
    }
}

module.exports = { nodeClass: GooglePaLM_LLMs }
