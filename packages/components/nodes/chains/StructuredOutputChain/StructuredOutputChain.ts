import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { getBaseClasses, handleEscapeCharacters } from '../../../src/utils'
import { LLMChain } from 'langchain/chains'
import { ConsoleCallbackHandler } from '../../../src/handler'
import { z } from 'zod'
import { createStructuredOutputChainFromZod } from 'langchain/chains/openai_functions'
import { ChatOpenAI } from 'langchain/chat_models/openai'

class StructuredOutputChain_Chains implements INode {
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
        this.label = 'Structured Output LLM Chain'
        this.name = 'structuredOutputLLMChain'
        this.version = 1.0
        this.type = 'StructuredOutputLLMChain'
        this.icon = 'chain.svg'
        this.category = 'Chains'
        this.description = 'Chain to run queries against LLMs'
        this.baseClasses = [this.type, ...getBaseClasses(LLMChain)]
        this.inputs = [
            {
                label: 'OpenAI Chat Model',
                name: 'model',
                type: 'ChatOpenAI'
            },
            {
                label: 'Chat Prompt',
                name: 'chatPrompt',
                type: 'ChatPromptTemplate'
            },
            {
                label: 'Structure Description',
                name: 'description',
                type: 'string',
                rows: 4,
                description: 'Describe how the output JSON should be returned',
                placeholder: 'An array of food items mentioned in the text'
            }
        ]
        this.outputs = [
            {
                label: 'Structured Output LLM Chain',
                name: 'structuredOutputLLMChain',
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
        const model = nodeData.inputs?.model as ChatOpenAI
        const chatPrompt = nodeData.inputs?.chatPrompt
        const output = nodeData.outputs?.output as string
        const promptValues = chatPrompt.promptValues as ICommonObject
        console.log('chatPrompt=', chatPrompt)
        console.log('promptValues=', promptValues)

        const zodSchema = z.object({
            foods: z
                .array(
                    z.object({
                        name: z.string().describe('The name of the food item'),
                        healthy: z.boolean().describe('Whether the food is good for you'),
                        color: z.string().optional().describe('The color of the food')
                    })
                )
                .describe('An array of food items mentioned in the text')
        })

        if (output === this.name) {
            const chain = createStructuredOutputChainFromZod(zodSchema, {
                prompt: chatPrompt,
                llm: model,
                verbose: process.env.DEBUG === 'true' ? true : false
            })
            return chain
        } else if (output === 'outputPrediction') {
            const chain = createStructuredOutputChainFromZod(zodSchema, {
                prompt: chatPrompt,
                llm: model,
                verbose: process.env.DEBUG === 'true' ? true : false
            })

            const inputVariables = chatPrompt.inputVariables as string[] // ["product"]
            console.log('inputVariables11111111111111=', inputVariables)

            const res = await runPrediction(inputVariables, chain, input, promptValues, options)
            // eslint-disable-next-line no-console
            console.log('\x1b[92m\x1b[1m\n*****OUTPUT PREDICTION*****\n\x1b[0m\x1b[0m')
            // eslint-disable-next-line no-console
            console.log(res)
            console.log(typeof res)
            /**
             * Apply string transformation to convert special chars:
             * FROM: hello i am ben\n\n\thow are you?
             * TO: hello i am benFLOWISE_NEWLINEFLOWISE_NEWLINEFLOWISE_TABhow are you?
             */
            return handleEscapeCharacters(res, false)
        }
    }

    async run(nodeData: INodeData, input: string, options: ICommonObject): Promise<string> {
        const inputVariables = nodeData.inputs?.chatPrompt.inputVariables as string[] // ["product"]
        const chain = nodeData.instance as LLMChain
        const promptValues = nodeData.inputs?.chatPrompt.promptValues as ICommonObject

        console.log('inputVariables 2 =', inputVariables)
        console.log('promptValues 2 =', promptValues)

        const res = await runPrediction(inputVariables, chain, input, promptValues, options)
        // eslint-disable-next-line no-console
        console.log('\x1b[93m\x1b[1m\n*****FINAL RESULT*****\n\x1b[0m\x1b[0m')
        // eslint-disable-next-line no-console
        console.log(res)
        console.log(typeof res)
        if (typeof res === 'object') {
            if (options.isInternal) return '```json\n' + JSON.stringify(res, null, 2) + '\n```'
            else return res
        }
        return res
    }
}

const runPrediction = async (
    inputVariables: string[],
    chain: LLMChain,
    input: string,
    promptValuesRaw: ICommonObject,
    options: ICommonObject
) => {
    const loggerHandler = new ConsoleCallbackHandler(options.logger)

    /**
     * Apply string transformation to reverse converted special chars:
     * FROM: { "value": "hello i am benFLOWISE_NEWLINEFLOWISE_NEWLINEFLOWISE_TABhow are you?" }
     * TO: { "value": "hello i am ben\n\n\thow are you?" }
     */
    const promptValues = handleEscapeCharacters(promptValuesRaw, true)
    console.log('promptValues ESCAPED =', promptValues)

    if (inputVariables.length === 1) {
        const res = await chain.run(input, [loggerHandler])
        return res
    } else if (inputVariables.length > 1) {
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
            const res = await chain.call(options, [loggerHandler])
            return res?.text
        } else if (seen.length === 1) {
            // If one inputVariable is not specify, use input (user's question) as value
            const lastValue = seen.pop()
            if (!lastValue) throw new Error('Please provide Prompt Values')
            const options = {
                ...promptValues,
                [lastValue]: input
            }
            const res = await chain.call(options, [loggerHandler])
            return res?.text
        } else {
            throw new Error(`Please provide Prompt Values for: ${seen.join(', ')}`)
        }
    } else {
        const res = await chain.run(input, [loggerHandler])
        return res
    }
}

module.exports = { nodeClass: StructuredOutputChain_Chains }
