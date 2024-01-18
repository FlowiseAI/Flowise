import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam, handleEscapeCharacters } from '../../../src/utils'
import { OpenAIMultiModalChainInput, VLLMChain } from './VLLMChain'
import { ConsoleCallbackHandler, CustomChainHandler, additionalCallbacks } from '../../../src/handler'
import { formatResponse } from '../../outputparsers/OutputParserHelpers'
import { checkInputs, Moderation, streamResponse } from '../../moderation/Moderation'

class OpenAIMultiModalChain_Chains implements INode {
    label: string
    name: string
    version: number
    type: string
    icon: string
    badge: string
    category: string
    baseClasses: string[]
    description: string
    inputs: INodeParams[]
    outputs: INodeOutputsValue[]
    credential: INodeParams

    constructor() {
        this.label = 'Open AI MultiModal Chain'
        this.name = 'openAIMultiModalChain'
        this.version = 1.0
        this.type = 'OpenAIMultiModalChain'
        this.icon = 'chain.svg'
        this.category = 'Chains'
        this.badge = 'BETA'
        this.description = 'Chain to query against Image and Audio Input.'
        this.baseClasses = [this.type, ...getBaseClasses(VLLMChain)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['openAIApi']
        }
        this.inputs = [
            {
                label: 'Prompt',
                name: 'prompt',
                type: 'BasePromptTemplate',
                optional: true
            },
            {
                label: 'Input Moderation',
                description: 'Detect text that could generate harmful output and prevent it from being sent to the language model',
                name: 'inputModeration',
                type: 'Moderation',
                optional: true,
                list: true
            },
            {
                label: 'Model Name',
                name: 'modelName',
                type: 'options',
                options: [
                    {
                        label: 'gpt-4-vision-preview',
                        name: 'gpt-4-vision-preview'
                    }
                ],
                default: 'gpt-4-vision-preview'
            },
            {
                label: 'Speech to Text',
                name: 'speechToText',
                type: 'boolean',
                optional: true
            },
            // TODO: only show when speechToText is true
            {
                label: 'Speech to Text Method',
                description: 'How to turn audio into text',
                name: 'speechToTextMode',
                type: 'options',
                options: [
                    {
                        label: 'Transcriptions',
                        name: 'transcriptions',
                        description:
                            'Transcribe audio into whatever language the audio is in. Default method when Speech to Text is turned on.'
                    },
                    {
                        label: 'Translations',
                        name: 'translations',
                        description: 'Translate and transcribe the audio into english.'
                    }
                ],
                optional: false,
                default: 'transcriptions',
                additionalParams: true
            },
            {
                label: 'Image Resolution',
                description: 'This parameter controls the resolution in which the model views the image.',
                name: 'imageResolution',
                type: 'options',
                options: [
                    {
                        label: 'Low',
                        name: 'low'
                    },
                    {
                        label: 'High',
                        name: 'high'
                    },
                    {
                        label: 'Auto',
                        name: 'auto'
                    }
                ],
                default: 'low',
                optional: false,
                additionalParams: true
            },
            {
                label: 'Temperature',
                name: 'temperature',
                type: 'number',
                step: 0.1,
                default: 0.9,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Top Probability',
                name: 'topP',
                type: 'number',
                step: 0.1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Max Tokens',
                name: 'maxTokens',
                type: 'number',
                step: 1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Accepted Upload Types',
                name: 'allowedUploadTypes',
                type: 'string',
                default: 'image/gif;image/jpeg;image/png;image/webp;audio/mpeg;audio/x-wav;audio/mp4',
                hidden: true
            },
            {
                label: 'Maximum Upload Size (MB)',
                name: 'maxUploadSize',
                type: 'number',
                default: '5',
                hidden: true
            }
        ]
        this.outputs = [
            {
                label: 'Open AI MultiModal Chain',
                name: 'openAIMultiModalChain',
                baseClasses: [this.type, ...getBaseClasses(VLLMChain)]
            },
            {
                label: 'Output Prediction',
                name: 'outputPrediction',
                baseClasses: ['string', 'json']
            }
        ]
    }

    async init(nodeData: INodeData, input: string, options: ICommonObject): Promise<any> {
        const prompt = nodeData.inputs?.prompt
        const output = nodeData.outputs?.output as string
        const imageResolution = nodeData.inputs?.imageResolution
        const promptValues = prompt.promptValues as ICommonObject
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const openAIApiKey = getCredentialParam('openAIApiKey', credentialData, nodeData)
        const temperature = nodeData.inputs?.temperature as string
        const modelName = nodeData.inputs?.modelName as string
        const maxTokens = nodeData.inputs?.maxTokens as string
        const topP = nodeData.inputs?.topP as string
        const speechToText = nodeData.inputs?.speechToText as boolean

        const fields: OpenAIMultiModalChainInput = {
            openAIApiKey: openAIApiKey,
            imageResolution: imageResolution,
            verbose: process.env.DEBUG === 'true',
            uploads: options.uploads,
            modelName: modelName
        }
        if (temperature) fields.temperature = parseFloat(temperature)
        if (maxTokens) fields.maxTokens = parseInt(maxTokens, 10)
        if (topP) fields.topP = parseFloat(topP)
        if (speechToText) {
            const speechToTextMode = nodeData.inputs?.speechToTextMode ?? 'transcriptions'
            if (speechToTextMode) fields.speechToTextMode = speechToTextMode
        }

        if (output === this.name) {
            const chain = new VLLMChain({
                ...fields,
                prompt: prompt
            })
            return chain
        } else if (output === 'outputPrediction') {
            const chain = new VLLMChain({
                ...fields
            })
            const inputVariables: string[] = prompt.inputVariables as string[] // ["product"]
            const res = await runPrediction(inputVariables, chain, input, promptValues, options, nodeData)
            // eslint-disable-next-line no-console
            console.log('\x1b[92m\x1b[1m\n*****OUTPUT PREDICTION*****\n\x1b[0m\x1b[0m')
            // eslint-disable-next-line no-console
            console.log(res)
            /**
             * Apply string transformation to convert special chars:
             * FROM: hello i am ben\n\n\thow are you?
             * TO: hello i am benFLOWISE_NEWLINEFLOWISE_NEWLINEFLOWISE_TABhow are you?
             */
            return handleEscapeCharacters(res, false)
        }
    }

    async run(nodeData: INodeData, input: string, options: ICommonObject): Promise<string | object> {
        const prompt = nodeData.inputs?.prompt
        const inputVariables: string[] = prompt.inputVariables as string[] // ["product"]
        const chain = nodeData.instance as VLLMChain
        let promptValues: ICommonObject | undefined = nodeData.inputs?.prompt.promptValues as ICommonObject
        const res = await runPrediction(inputVariables, chain, input, promptValues, options, nodeData)
        // eslint-disable-next-line no-console
        console.log('\x1b[93m\x1b[1m\n*****FINAL RESULT*****\n\x1b[0m\x1b[0m')
        // eslint-disable-next-line no-console
        console.log(res)
        return res
    }
}

const runPrediction = async (
    inputVariables: string[],
    chain: VLLMChain,
    input: string,
    promptValuesRaw: ICommonObject | undefined,
    options: ICommonObject,
    nodeData: INodeData
) => {
    const loggerHandler = new ConsoleCallbackHandler(options.logger)
    const callbacks = await additionalCallbacks(nodeData, options)

    const isStreaming = options.socketIO && options.socketIOClientId
    const socketIO = isStreaming ? options.socketIO : undefined
    const socketIOClientId = isStreaming ? options.socketIOClientId : ''
    const moderations = nodeData.inputs?.inputModeration as Moderation[]
    const speechToText = nodeData.inputs?.speechToText as boolean

    if (options?.uploads) {
        if (options.uploads.length === 1 && input.length === 0) {
            if (speechToText) {
                //special case, text input is empty, but we have an upload (recorded audio)
                const convertedText = await chain.processAudioWithWisper(options.uploads[0], undefined)
                //so we use the upload as input
                input = convertedText
            }
            // do not send the audio file to the model
        } else {
            chain.uploads = options.uploads
        }
    }

    if (moderations && moderations.length > 0) {
        try {
            // Use the output of the moderation chain as input for the LLM chain
            input = await checkInputs(moderations, input)
        } catch (e) {
            await new Promise((resolve) => setTimeout(resolve, 500))
            streamResponse(isStreaming, e.message, socketIO, socketIOClientId)
            return formatResponse(e.message)
        }
    }

    /**
     * Apply string transformation to reverse converted special chars:
     * FROM: { "value": "hello i am benFLOWISE_NEWLINEFLOWISE_NEWLINEFLOWISE_TABhow are you?" }
     * TO: { "value": "hello i am ben\n\n\thow are you?" }
     */
    const promptValues = handleEscapeCharacters(promptValuesRaw, true)
    if (promptValues && inputVariables.length > 0) {
        let seen: string[] = []

        for (const variable of inputVariables) {
            seen.push(variable)
            if (promptValues[variable]) {
                chain.inputKey = variable
                seen.pop()
            }
        }

        if (seen.length === 0) {
            // All inputVariables have fixed values specified
            const options = { ...promptValues }
            if (isStreaming) {
                const handler = new CustomChainHandler(socketIO, socketIOClientId)
                const res = await chain.call(options, [loggerHandler, handler, ...callbacks])
                return formatResponse(res?.text)
            } else {
                const res = await chain.call(options, [loggerHandler, ...callbacks])
                return formatResponse(res?.text)
            }
        } else if (seen.length === 1) {
            // If one inputVariable is not specify, use input (user's question) as value
            const lastValue = seen.pop()
            if (!lastValue) throw new Error('Please provide Prompt Values')
            chain.inputKey = lastValue as string
            const options = {
                ...promptValues,
                [lastValue]: input
            }
            if (isStreaming) {
                const handler = new CustomChainHandler(socketIO, socketIOClientId)
                const res = await chain.call(options, [loggerHandler, handler, ...callbacks])
                return formatResponse(res?.text)
            } else {
                const res = await chain.call(options, [loggerHandler, ...callbacks])
                return formatResponse(res?.text)
            }
        } else {
            throw new Error(`Please provide Prompt Values for: ${seen.join(', ')}`)
        }
    } else {
        if (isStreaming) {
            const handler = new CustomChainHandler(socketIO, socketIOClientId)
            const res = await chain.run(input, [loggerHandler, handler, ...callbacks])
            return formatResponse(res)
        } else {
            const res = await chain.run(input, [loggerHandler, ...callbacks])
            return formatResponse(res)
        }
    }
}

module.exports = { nodeClass: OpenAIMultiModalChain_Chains }
