import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { getBaseClasses, handleEscapeCharacters } from '../../../src/utils'
import { LLMChain } from 'langchain/chains'
import { BaseLanguageModel } from 'langchain/base_language'
import { ConsoleCallbackHandler, CustomChainHandler, additionalCallbacks } from '../../../src/handler'
import { BaseOutputParser } from 'langchain/schema/output_parser'
import { ChatPromptTemplate, PromptTemplate, SystemMessagePromptTemplate } from 'langchain/prompts'

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

    constructor() {
        this.label = 'LLM Chain'
        this.name = 'llmChain'
        this.version = 2.0
        this.type = 'LLMChain'
        this.icon = 'chain.svg'
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
        const promptValues = prompt.promptValues as ICommonObject

        if (output === this.name) {
            const chain = new LLMChain({ llm: model, prompt, verbose: process.env.DEBUG === 'true' ? true : false })
            return chain
        } else if (output === 'outputPrediction') {
            const chain = new LLMChain({ llm: model, prompt, verbose: process.env.DEBUG === 'true' ? true : false })
            const inputVariables = chain.prompt.inputVariables as string[] // ["product"]
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

    async run(nodeData: INodeData, input: string, options: ICommonObject): Promise<string> {
        const inputVariables = nodeData.instance.prompt.inputVariables as string[] // ["product"]
        const chain = nodeData.instance as LLMChain
        let promptValues = nodeData.inputs?.prompt.promptValues as ICommonObject
        const outputParser = nodeData.inputs?.outputParser as BaseOutputParser
        if (outputParser && chain.prompt) {
            const formatInstructions = outputParser.getFormatInstructions()
            chain.prompt.inputVariables.push('format_instructions')
            if (chain.prompt instanceof PromptTemplate) {
                let pt = chain.prompt
                pt.template = pt.template + '\n{format_instructions}'
                chain.prompt.partialVariables = { format_instructions: formatInstructions }
                // eslint-disable-next-line no-console
                console.log('prompt :: ', chain.prompt)
            } else if (chain.prompt instanceof ChatPromptTemplate) {
                let pt = chain.prompt
                pt.promptMessages.forEach((msg) => {
                    if (msg instanceof SystemMessagePromptTemplate) {
                        ;(msg.prompt as any).partialVariables = { format_instructions: outputParser.getFormatInstructions() }
                        ;(msg.prompt as any).template = ((msg.prompt as any).template + '\n{format_instructions}') as string
                        // eslint-disable-next-line no-console
                        console.log(msg)
                    }
                })
                //pt.template = pt.template + '\n{format_instructions}'
            }

            promptValues = { ...promptValues, format_instructions: outputParser.getFormatInstructions() }
            // eslint-disable-next-line no-console
            console.log('promptValues :: ', promptValues)
        }
        const res = await runPrediction(inputVariables, chain, input, promptValues, options, nodeData, outputParser)
        // eslint-disable-next-line no-console
        console.log('\x1b[93m\x1b[1m\n*****FINAL RESULT*****\n\x1b[0m\x1b[0m')
        // eslint-disable-next-line no-console
        console.log(res)
        return res
    }
}

const runPrediction = async (
    inputVariables: string[],
    chain: LLMChain,
    input: string,
    promptValuesRaw: ICommonObject,
    options: ICommonObject,
    nodeData: INodeData,
    outputParser: BaseOutputParser | undefined = undefined
) => {
    const loggerHandler = new ConsoleCallbackHandler(options.logger)
    const callbacks = await additionalCallbacks(nodeData, options)

    const isStreaming = options.socketIO && options.socketIOClientId
    const socketIO = isStreaming ? options.socketIO : undefined
    const socketIOClientId = isStreaming ? options.socketIOClientId : ''

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
                seen.pop()
            }
        }

        if (seen.length === 0) {
            // All inputVariables have fixed values specified
            const options = { ...promptValues }
            if (isStreaming) {
                const handler = new CustomChainHandler(socketIO, socketIOClientId)
                const res = await chain.call(options, [loggerHandler, handler, ...callbacks])
                return runOutputParser(res?.text, outputParser)
            } else {
                const res = await chain.call(options, [loggerHandler, ...callbacks])
                return runOutputParser(res?.text, outputParser)
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
                return runOutputParser(res?.text, outputParser)
            } else {
                const res = await chain.call(options, [loggerHandler, ...callbacks])
                return runOutputParser(res?.text, outputParser)
            }
        } else {
            throw new Error(`Please provide Prompt Values for: ${seen.join(', ')}`)
        }
    } else {
        if (isStreaming) {
            const handler = new CustomChainHandler(socketIO, socketIOClientId)
            const res = await chain.run(input, [loggerHandler, handler, ...callbacks])
            return runOutputParser(res, outputParser)
        } else {
            const res = await chain.run(input, [loggerHandler, ...callbacks])
            return runOutputParser(res, outputParser)
        }
    }
}

const runOutputParser = async (response: string, outputParser: BaseOutputParser | undefined): Promise<string> => {
    if (outputParser) {
        const parsedResponse = await outputParser.parse(response)
        // eslint-disable-next-line no-console
        console.log('**** parsedResponse ****', parsedResponse)
        if (typeof parsedResponse === 'object') {
            return JSON.stringify(parsedResponse)
        } else {
            return parsedResponse as string
        }
    }
    return response
}

module.exports = { nodeClass: LLMChain_Chains }
