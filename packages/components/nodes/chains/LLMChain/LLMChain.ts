import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { getBaseClasses, handleEscapeCharacters } from '../../../src/utils'
import { LLMChain } from 'langchain/chains'
import { BaseLanguageModel, BaseLanguageModelCallOptions } from 'langchain/base_language'
import { ConsoleCallbackHandler, CustomChainHandler, additionalCallbacks } from '../../../src/handler'
import { BaseOutputParser } from 'langchain/schema/output_parser'
import { formatResponse, injectOutputParser } from '../../outputparsers/OutputParserHelpers'
import { BaseLLMOutputParser } from 'langchain/schema/output_parser'
import { OutputFixingParser } from 'langchain/output_parsers'
import { checkInputs, Moderation, streamResponse } from '../../moderation/Moderation'

class LLMChain_Chains implements INode {
    label: string
    name: string
    version: number
    type: string
    icon: string
    category: string
    baseClasses: string[]
    description: string
    inputs: INodeParams[]
    outputs: INodeOutputsValue[]
    outputParser: BaseOutputParser

    constructor() {
        this.label = 'LLM Chain'
        this.name = 'llmChain'
        this.version = 3.0
        this.type = 'LLMChain'
        this.icon = 'LLM_Chain.svg'
        this.category = 'Chains'
        this.description = 'Chain to run queries against LLMs'
        this.baseClasses = [this.type, ...getBaseClasses(LLMChain)]
        this.inputs = [
            {
                label: 'Language Model',
                name: 'model',
                type: 'BaseLanguageModel'
            },
            {
                label: 'Prompt',
                name: 'prompt',
                type: 'BasePromptTemplate'
            },
            {
                label: 'Output Parser',
                name: 'outputParser',
                type: 'BaseLLMOutputParser',
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
                label: 'Chain Name',
                name: 'chainName',
                type: 'string',
                placeholder: 'Name Your Chain',
                optional: true
            }
        ]
        this.outputs = [
            {
                label: 'LLM Chain',
                name: 'llmChain',
                baseClasses: [this.type, ...getBaseClasses(LLMChain)]
            },
            {
                label: 'Output Prediction',
                name: 'outputPrediction',
                baseClasses: ['string', 'json']
            }
        ]
    }

    async init(nodeData: INodeData, input: string, options: ICommonObject): Promise<any> {
        const model = nodeData.inputs?.model as BaseLanguageModel
        const prompt = nodeData.inputs?.prompt
        const output = nodeData.outputs?.output as string
        let promptValues: ICommonObject | undefined = nodeData.inputs?.prompt.promptValues as ICommonObject
        const llmOutputParser = nodeData.inputs?.outputParser as BaseOutputParser
        this.outputParser = llmOutputParser
        if (llmOutputParser) {
            let autoFix = (llmOutputParser as any).autoFix
            if (autoFix === true) {
                this.outputParser = OutputFixingParser.fromLLM(model, llmOutputParser)
            }
        }
        if (output === this.name) {
            const chain = new LLMChain({
                llm: model,
                outputParser: this.outputParser as BaseLLMOutputParser<string | object>,
                prompt,
                verbose: process.env.DEBUG === 'true'
            })
            return chain
        } else if (output === 'outputPrediction') {
            const chain = new LLMChain({
                llm: model,
                outputParser: this.outputParser as BaseLLMOutputParser<string | object>,
                prompt,
                verbose: process.env.DEBUG === 'true'
            })
            const inputVariables = chain.prompt.inputVariables as string[] // ["product"]
            promptValues = injectOutputParser(this.outputParser, chain, promptValues)
            const res = await runPrediction(inputVariables, chain, input, promptValues, options, nodeData)
            // eslint-disable-next-line no-console
            console.log('\x1b[92m\x1b[1m\n*****OUTPUT PREDICTION*****\n\x1b[0m\x1b[0m')
            // eslint-disable-next-line no-console
            console.log(res)

            let finalRes = res
            if (this.outputParser && typeof res === 'object' && Object.prototype.hasOwnProperty.call(res, 'json')) {
                finalRes = (res as ICommonObject).json
            }

            /**
             * Apply string transformation to convert special chars:
             * FROM: hello i am ben\n\n\thow are you?
             * TO: hello i am benFLOWISE_NEWLINEFLOWISE_NEWLINEFLOWISE_TABhow are you?
             */
            return handleEscapeCharacters(finalRes, false)
        }
    }

    async run(nodeData: INodeData, input: string, options: ICommonObject): Promise<string | object> {
        const inputVariables = nodeData.instance.prompt.inputVariables as string[] // ["product"]
        const chain = nodeData.instance as LLMChain
        let promptValues: ICommonObject | undefined = nodeData.inputs?.prompt.promptValues as ICommonObject
        const outputParser = nodeData.inputs?.outputParser as BaseOutputParser
        if (!this.outputParser && outputParser) {
            this.outputParser = outputParser
        }
        promptValues = injectOutputParser(this.outputParser, chain, promptValues)
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
    chain: LLMChain<string | object | BaseLanguageModel<any, BaseLanguageModelCallOptions>>,
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
    /**
     * Apply string transformation to reverse converted special chars:
     * FROM: { "value": "hello i am benFLOWISE_NEWLINEFLOWISE_NEWLINEFLOWISE_TABhow are you?" }
     * TO: { "value": "hello i am ben\n\n\thow are you?" }
     */
    const promptValues = handleEscapeCharacters(promptValuesRaw, true)

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

    if (promptValues && inputVariables.length > 0) {
        let seen: string[] = []

        for (const variable of inputVariables) {
            seen.push(variable)
            if (promptValues[variable]) {
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

module.exports = { nodeClass: LLMChain_Chains }
