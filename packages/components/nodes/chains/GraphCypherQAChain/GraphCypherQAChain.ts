import {
    ICommonObject,
    INode,
    INodeData,
    INodeParams,
    INodeOutputsValue,
    IServerSideEventStreamer,
    FlowiseMemory
} from '../../../src/Interface'
import { GraphCypherQAChain } from '@langchain/community/chains/graph_qa/cypher'
import { getBaseClasses } from '../../../src/utils'
import { BasePromptTemplate, PromptTemplate, FewShotPromptTemplate } from '@langchain/core/prompts'
import { ConsoleCallbackHandler, CustomChainHandler, additionalCallbacks } from '../../../src/handler'
import { ConsoleCallbackHandler as LCConsoleCallbackHandler } from '@langchain/core/tracers/console'
import { checkInputs, Moderation, streamResponse } from '../../moderation/Moderation'
import { formatResponse } from '../../outputparsers/OutputParserHelpers'

class GraphCypherQA_Chain implements INode {
    label: string
    name: string
    version: number
    type: string
    icon: string
    category: string
    description: string
    baseClasses: string[]
    inputs: INodeParams[]
    outputs: INodeOutputsValue[]
    sessionId?: string

    constructor(fields?: { sessionId?: string }) {
        this.label = 'Graph Cypher QA Chain'
        this.name = 'graphCypherQAChain'
        this.version = 2.0
        this.type = 'GraphCypherQAChain'
        this.icon = 'graphqa.svg'
        this.category = 'Chains'
        this.description = 'Advanced chain for question-answering against a Neo4j graph by generating Cypher statements'
        this.baseClasses = [this.type, ...getBaseClasses(GraphCypherQAChain)]
        this.sessionId = fields?.sessionId
        this.inputs = [
            {
                label: 'Language Model',
                name: 'model',
                type: 'BaseLanguageModel',
                optional: true,
                description: 'Model for generating Cypher queries and answers.'
            },
            {
                label: 'Cypher Generation Model',
                name: 'cypherModel',
                optional: true,
                type: 'BaseLanguageModel',
                description: 'Model for generating Cypher queries. If not provided, the main model will be used.'
            },
            {
                label: 'QA Model',
                name: 'qaModel',
                optional: true,
                type: 'BaseLanguageModel',
                description: 'Model for generating answers. If not provided, the main model will be used.'
            },
            {
                label: 'Neo4j Graph',
                name: 'graph',
                type: 'Neo4j'
            },
            {
                label: 'Memory',
                name: 'memory',
                type: 'BaseMemory',
                optional: true,
                description: 'Memory to store chat history for context'
            },
            {
                label: 'Cypher Generation Prompt',
                name: 'cypherPrompt',
                type: 'BasePromptTemplate',
                description: 'Prompt template for generating Cypher queries. Must include {schema} and {question} variables'
            },
            {
                label: 'QA Prompt',
                name: 'qaPrompt',
                optional: true,
                type: 'BasePromptTemplate',
                description: 'Prompt template for generating answers. Must include {context} and {question} variables'
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
                label: 'Return Direct',
                name: 'returnDirect',
                type: 'boolean',
                default: false,
                optional: true,
                description: 'If true, return the raw query results instead of using the QA chain'
            },
            {
                label: 'Return Intermediate Steps',
                name: 'returnIntermediateSteps',
                type: 'boolean',
                default: false,
                optional: true,
                description: 'If true, return the intermediate steps in the chain execution'
            }
        ]
        this.outputs = [
            {
                label: 'Graph Cypher QA Chain',
                name: 'graphCypherQAChain',
                baseClasses: [this.type, ...getBaseClasses(GraphCypherQAChain)]
            },
            {
                label: 'Output Prediction',
                name: 'outputPrediction',
                baseClasses: ['string', 'json']
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const model = nodeData.inputs?.model
        const cypherModel = nodeData.inputs?.cypherModel
        const qaModel = nodeData.inputs?.qaModel
        const graph = nodeData.inputs?.graph
        const cypherPrompt = nodeData.inputs?.cypherPrompt as BasePromptTemplate | FewShotPromptTemplate
        const qaPrompt = nodeData.inputs?.qaPrompt as BasePromptTemplate
        const returnDirect = nodeData.inputs?.returnDirect as boolean
        const returnIntermediateSteps = nodeData.inputs?.returnIntermediateSteps as boolean

        const omitQaPrompt = cypherPrompt instanceof FewShotPromptTemplate

        // Handle prompt values if they exist
        let cypherPromptTemplate: PromptTemplate | FewShotPromptTemplate
        let qaPromptTemplate: PromptTemplate | undefined

        if (cypherPrompt instanceof PromptTemplate) {
            cypherPromptTemplate = new PromptTemplate({
                template: cypherPrompt.template as string,
                inputVariables: cypherPrompt.inputVariables
            })
        } else if (cypherPrompt instanceof FewShotPromptTemplate) {
            const examplePrompt = cypherPrompt.examplePrompt as PromptTemplate

            cypherPromptTemplate = new FewShotPromptTemplate({
                examples: cypherPrompt.examples,
                examplePrompt: examplePrompt,
                inputVariables: cypherPrompt.inputVariables,
                prefix: cypherPrompt.prefix,
                suffix: cypherPrompt.suffix,
                exampleSeparator: cypherPrompt.exampleSeparator,
                templateFormat: cypherPrompt.templateFormat
            })
        } else {
            cypherPromptTemplate = cypherPrompt as PromptTemplate
        }

        if (qaPrompt instanceof PromptTemplate) {
            qaPromptTemplate = new PromptTemplate({
                template: qaPrompt.template as string,
                inputVariables: qaPrompt.inputVariables
            })
        }

        if (!cypherModel || !qaModel) {
            if (!model) {
                throw new Error('Model or is required when Cypher Model or QA Model are not provided')
            }
        }

        // validate cypherPromptTemplate is PromptTemplate and qaPromptTemplate must be exists
        if (cypherPromptTemplate instanceof PromptTemplate && !qaPromptTemplate) {
            throw new Error('QA Prompt is required when Cypher Prompt is a Prompt Template')
        }

        // Validate required variables in prompts
        if (!cypherPromptTemplate.inputVariables.includes('schema') || !cypherPromptTemplate.inputVariables.includes('question')) {
            throw new Error('Cypher Generation Prompt must include {schema} and {question} variables')
        }

        const chain = GraphCypherQAChain.fromLLM({
            llm: model,
            qaLLM: qaModel,
            cypherLLM: cypherModel,
            graph,
            cypherPrompt: cypherPromptTemplate,
            qaPrompt: omitQaPrompt ? undefined : qaPromptTemplate,
            returnDirect,
            returnIntermediateSteps
        })

        return chain
    }

    async run(nodeData: INodeData, input: string, options: ICommonObject): Promise<string | object> {
        const chain = nodeData.instance as GraphCypherQAChain
        const memory = nodeData.inputs?.memory as FlowiseMemory
        const moderations = nodeData.inputs?.inputModeration as Moderation[]

        const shouldStreamResponse = options.shouldStreamResponse
        const sseStreamer: IServerSideEventStreamer = options.sseStreamer as IServerSideEventStreamer
        const chatId = options.chatId

        // Handle input moderation if configured
        if (moderations && moderations.length > 0) {
            try {
                input = await checkInputs(moderations, input)
            } catch (e) {
                await new Promise((resolve) => setTimeout(resolve, 500))
                if (shouldStreamResponse) {
                    streamResponse(sseStreamer, chatId, e.message)
                }
                return formatResponse(e.message)
            }
        }

        const obj = {
            query: input
        }

        const loggerHandler = new ConsoleCallbackHandler(options.logger)
        const callbackHandlers = await additionalCallbacks(nodeData, options)
        let callbacks = [loggerHandler, ...callbackHandlers]

        if (process.env.DEBUG === 'true') {
            callbacks.push(new LCConsoleCallbackHandler())
        }

        try {
            let response
            if (shouldStreamResponse) {
                const handler = new CustomChainHandler(sseStreamer, chatId)
                callbacks.push(handler)
                response = await chain.invoke(obj, { callbacks })
            } else {
                response = await chain.invoke(obj, { callbacks })
            }

            // Store in memory if configured
            if (memory) {
                await memory.addChatMessages(
                    [
                        {
                            text: input,
                            type: 'userMessage'
                        },
                        {
                            text: response?.result,
                            type: 'apiMessage'
                        }
                    ],
                    this.sessionId
                )
            }

            return response?.result
        } catch (error) {
            console.error('Error in GraphCypherQAChain:', error)
            if (shouldStreamResponse) {
                streamResponse(sseStreamer, chatId, error.message)
            }
            return formatResponse(`Error: ${error.message}`)
        }
    }
}

module.exports = { nodeClass: GraphCypherQA_Chain }
