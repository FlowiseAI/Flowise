import { ICommonObject, INode, INodeData, INodeParams, INodeOutputsValue, IServerSideEventStreamer } from '../../../src/Interface'
import { FromLLMInput, GraphCypherQAChain } from '@langchain/community/chains/graph_qa/cypher'
import { getBaseClasses } from '../../../src/utils'
import { BasePromptTemplate, PromptTemplate, FewShotPromptTemplate } from '@langchain/core/prompts'
import { ConsoleCallbackHandler, CustomChainHandler, additionalCallbacks } from '../../../src/handler'
import { ConsoleCallbackHandler as LCConsoleCallbackHandler } from '@langchain/core/tracers/console'
import { checkInputs, Moderation, streamResponse } from '../../moderation/Moderation'
import { formatResponse } from '../../outputparsers/OutputParserHelpers'

/**
 * Patterns that identify write operations in Cypher queries
 * These operations can modify the database and should be blocked
 */
const CYPHER_WRITE_PATTERNS = [
    /\bCREATE\b/i,
    /\bMERGE\b/i,
    /\bDELETE\b/i,
    /\bDETACH\s+DELETE\b/i,
    /\bSET\b/i,
    /\bREMOVE\b/i,
    /\bDROP\b/i,
    /\bCALL\b/i,
    /\bLOAD\s+CSV\b/i,
    /\bFOREACH\b/i
]

/**
 * Validates generated Cypher queries to prevent write operations
 * This is applied to LLM-generated queries before execution
 * Write operations are always blocked for security
 *
 * @param query - The Cypher query to validate
 * @throws Error if query contains write operations
 */
export function validateCypherQuery(query: string): void {
    // Strip string literals to avoid false positives on data values
    const stripped = query.replace(/'[^']*'/g, '""').replace(/"[^"]*"/g, '""')

    for (const pattern of CYPHER_WRITE_PATTERNS) {
        if (pattern.test(stripped)) {
            throw new Error(
                'Generated Cypher query contains a write operation which is not allowed. ' +
                    'This node only supports read-only queries for security.'
            )
        }
    }
}

/**
 * Normalize and harden user input before sending to the LLM.
 *
 * NOTE:
 * This is NOT a substitute for Cypher validation.
 * It only reduces obvious abuse patterns and normalizes input.
 */
export function sanitizeUserInput(input: string, maxLength = 2000): string {
    if (!input || typeof input !== 'string') {
        return ''
    }

    let sanitized = input

    // Normalize Unicode (prevents homoglyph & encoding tricks)
    sanitized = sanitized.normalize('NFKC')

    // Remove NULL bytes and control characters (except tab/space)
    sanitized = sanitized.replace(/[\x00-\x08\x0B-\x1F\x7F]/g, '')

    // Remove line comments //
    sanitized = sanitized.replace(/\/\/.*$/gm, '')

    // Remove block comments /* ... */
    sanitized = sanitized.replace(/\/\*[\s\S]*?\*\//g, '')

    // Remove semicolons (prevent multi-statement injection attempts)
    sanitized = sanitized.replace(/;/g, '')

    // Collapse excessive whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim()

    // Enforce maximum length (defense-in-depth)
    if (sanitized.length > maxLength) {
        sanitized = sanitized.substring(0, maxLength)
    }

    return sanitized
}

/**
 * Enhanced prompt injection detection using multiple techniques
 *
 * This function implements a multi-layered approach to detect injection attempts:
 * 1. Prompt Manipulation: Detects attempts to override system instructions
 * 2. Cypher Injection: Identifies malicious Cypher patterns and commands
 * 3. Comment Injection: Detects attempts to use comments for injection
 * 4. Unicode Smuggling: Catches encoded characters used to bypass filters
 * 5. Obfuscation Detection: Identifies excessive special characters
 * 6. Keyword Clustering: Detects suspicious combinations of Cypher keywords
 *
 * Unlike simple deny-lists, this uses pattern matching and heuristics to catch
 * sophisticated attacks including:
 * - Case variations and whitespace manipulation
 * - Multi-statement injection attempts
 * - Administrative command execution (CALL dbms./db./apoc.)
 * - Database structure manipulation (DROP, CREATE INDEX/CONSTRAINT)
 *
 * @param input - User input to analyze
 * @returns true if potential injection detected, false otherwise
 */
export function detectPromptInjection(input: string): boolean {
    const lowerInput = input.toLowerCase()

    // Comprehensive injection patterns
    const injectionPatterns = [
        // Prompt manipulation attempts
        /ignore\s+(previous|all|above|prior)\s+(instructions?|prompts?|rules?)/i,
        /disregard\s+(the\s+)?(above|previous|prior|system)/i,
        /override\s+(the\s+)?(system|prompt|instructions?)/i,
        /forget\s+(your|the|all)\s+(instructions?|prompts?|rules?)/i,
        /new\s+(instructions?|prompts?|system|rules?)\s*:/i,
        /you\s+are\s+now/i,
        /act\s+as\s+(a\s+)?(?!user)/i, // Allow "act as user" but not other roles
        /roleplay\s+as/i,
        /pretend\s+(to\s+be|you\s+are)/i,

        // Cypher injection patterns
        /;\s*(?:MATCH|CREATE|MERGE|DELETE|DETACH|SET|REMOVE|DROP|CALL|LOAD|FOREACH)/i,
        /\}\s*\)\s*(?:MATCH|CREATE|MERGE|DELETE|RETURN)/i,
        /DETACH\s+DELETE/i,
        /CALL\s+dbms\./i,
        /CALL\s+db\./i,
        /CALL\s+apoc\./i,
        /LOAD\s+CSV/i,
        /DROP\s+(?:INDEX|CONSTRAINT|DATABASE)/i,
        /CREATE\s+(?:INDEX|CONSTRAINT|DATABASE)/i,

        // Comment injection (Cypher uses // for comments)
        /\/\/.*(?:MATCH|CREATE|MERGE|DELETE)/i,

        // Multiple statement attempts
        /;\s*;/,

        // Unicode smuggling common patterns
        /[\u2018\u2019\u201C\u201D\uFF07\uFF02]/,

        // Encoded/obfuscated attempts
        /\\u[0-9a-f]{4}/i,
        /\\x[0-9a-f]{2}/i
    ]

    for (const pattern of injectionPatterns) {
        if (pattern.test(input)) {
            return true
        }
    }

    // Check for excessive special characters (potential obfuscation)
    const specialCharCount = (input.match(/[{}()[\];|&$`\\]/g) || []).length
    if (specialCharCount > 5) {
        return true
    }

    // Check for suspicious Cypher keywords in close proximity
    const cypherKeywords = ['MATCH', 'CREATE', 'MERGE', 'DELETE', 'DETACH', 'SET', 'REMOVE', 'RETURN', 'WHERE', 'WITH']
    const foundKeywords = cypherKeywords.filter((keyword) => lowerInput.includes(keyword.toLowerCase()))
    if (foundKeywords.length >= 3) {
        return true
    }

    return false
}

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
    sessionId?: string
    outputs: INodeOutputsValue[]

    constructor(fields?: { sessionId?: string }) {
        this.label = 'Graph Cypher QA Chain'
        this.name = 'graphCypherQAChain'
        this.version = 1.1
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
                description: 'Model for generating Cypher queries and answers.'
            },
            {
                label: 'Neo4j Graph',
                name: 'graph',
                type: 'Neo4j'
            },
            {
                label: 'Cypher Generation Prompt',
                name: 'cypherPrompt',
                optional: true,
                type: 'BasePromptTemplate',
                description:
                    'Prompt template for generating Cypher queries. Must include {schema} and {question} variables. If not provided, default prompt will be used.'
            },
            {
                label: 'Cypher Generation Model',
                name: 'cypherModel',
                optional: true,
                type: 'BaseLanguageModel',
                description: 'Model for generating Cypher queries. If not provided, the main model will be used.'
            },
            {
                label: 'QA Prompt',
                name: 'qaPrompt',
                optional: true,
                type: 'BasePromptTemplate',
                description:
                    'Prompt template for generating answers. Must include {context} and {question} variables. If not provided, default prompt will be used.'
            },
            {
                label: 'QA Model',
                name: 'qaModel',
                optional: true,
                type: 'BaseLanguageModel',
                description: 'Model for generating answers. If not provided, the main model will be used.'
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

    async init(nodeData: INodeData, input: string, options: ICommonObject): Promise<any> {
        const model = nodeData.inputs?.model
        const cypherModel = nodeData.inputs?.cypherModel
        const qaModel = nodeData.inputs?.qaModel
        const graph = nodeData.inputs?.graph
        const maxResults = 100 // Hardcoded limit to prevent data exfiltration

        // Wrap graph.query to validate generated Cypher and limit results
        const originalQuery = graph.query.bind(graph)
        graph.query = async (cypher: string, params?: Record<string, any>) => {
            validateCypherQuery(cypher)
            const results = await originalQuery(cypher, params)

            // Limit results to prevent data exfiltration
            if (Array.isArray(results) && results.length > maxResults) {
                return results.slice(0, maxResults)
            }

            return results
        }

        const cypherPrompt = nodeData.inputs?.cypherPrompt as BasePromptTemplate | FewShotPromptTemplate | undefined
        const qaPrompt = nodeData.inputs?.qaPrompt as BasePromptTemplate | undefined
        const returnDirect = nodeData.inputs?.returnDirect as boolean
        const output = nodeData.outputs?.output as string

        if (!model) {
            throw new Error('Language Model is required')
        }

        // Handle prompt values if they exist
        let cypherPromptTemplate: PromptTemplate | FewShotPromptTemplate | undefined
        let qaPromptTemplate: PromptTemplate | undefined

        if (cypherPrompt) {
            if (cypherPrompt instanceof PromptTemplate) {
                cypherPromptTemplate = new PromptTemplate({
                    template: cypherPrompt.template as string,
                    inputVariables: cypherPrompt.inputVariables
                })
                if (!qaPrompt) {
                    throw new Error('QA Prompt is required when Cypher Prompt is a Prompt Template')
                }
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
        }

        if (qaPrompt instanceof PromptTemplate) {
            qaPromptTemplate = new PromptTemplate({
                template: qaPrompt.template as string,
                inputVariables: qaPrompt.inputVariables
            })
        }

        // Validate required variables in prompts
        if (
            cypherPromptTemplate &&
            (!cypherPromptTemplate?.inputVariables.includes('schema') || !cypherPromptTemplate?.inputVariables.includes('question'))
        ) {
            throw new Error('Cypher Generation Prompt must include {schema} and {question} variables')
        }

        const fromLLMInput: FromLLMInput = {
            llm: model,
            graph,
            returnDirect
        }

        if (cypherPromptTemplate) {
            fromLLMInput['cypherLLM'] = cypherModel ?? model
            fromLLMInput['cypherPrompt'] = cypherPromptTemplate
        }

        if (qaPromptTemplate) {
            fromLLMInput['qaLLM'] = qaModel ?? model
            fromLLMInput['qaPrompt'] = qaPromptTemplate
        }

        const chain = GraphCypherQAChain.fromLLM(fromLLMInput)

        if (output === this.name) {
            return chain
        } else if (output === 'outputPrediction') {
            nodeData.instance = chain
            return await this.run(nodeData, input, options)
        }

        return chain
    }

    async run(nodeData: INodeData, input: string, options: ICommonObject): Promise<string | object> {
        const chain = nodeData.instance as GraphCypherQAChain
        const moderations = nodeData.inputs?.inputModeration as Moderation[]
        const returnDirect = nodeData.inputs?.returnDirect as boolean
        const maxInputLength = 2000 // Hardcoded limit to prevent abuse

        const shouldStreamResponse = options.shouldStreamResponse
        const sseStreamer: IServerSideEventStreamer = options.sseStreamer as IServerSideEventStreamer
        const chatId = options.chatId

        // Input length validation
        if (input && input.length > maxInputLength) {
            const errorMessage = `Input rejected: exceeds maximum allowed length of ${maxInputLength} characters.`
            if (shouldStreamResponse) {
                streamResponse(sseStreamer, chatId, errorMessage)
            }
            return formatResponse(errorMessage)
        }

        // Built-in prompt injection detection (always active)
        if (detectPromptInjection(input)) {
            const errorMessage = 'Input rejected: potential Cypher injection or prompt manipulation detected.'
            await new Promise((resolve) => setTimeout(resolve, 500))
            if (shouldStreamResponse) {
                streamResponse(sseStreamer, chatId, errorMessage)
            }
            return formatResponse(errorMessage)
        }

        input = sanitizeUserInput(input)

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

        const loggerHandler = new ConsoleCallbackHandler(options.logger, options?.orgId)
        const callbackHandlers = await additionalCallbacks(nodeData, options)
        let callbacks = [loggerHandler, ...callbackHandlers]

        if (process.env.DEBUG === 'true') {
            callbacks.push(new LCConsoleCallbackHandler())
        }

        try {
            let response
            if (shouldStreamResponse) {
                if (returnDirect) {
                    response = await chain.invoke(obj, { callbacks })
                    let result = response?.result
                    if (typeof result === 'object') {
                        result = '```json\n' + JSON.stringify(result, null, 2)
                    }
                    if (result && typeof result === 'string') {
                        streamResponse(sseStreamer, chatId, result)
                    }
                } else {
                    const handler = new CustomChainHandler(sseStreamer, chatId, 2)
                    callbacks.push(handler)
                    response = await chain.invoke(obj, { callbacks })
                }
            } else {
                response = await chain.invoke(obj, { callbacks })
            }

            return formatResponse(response?.result)
        } catch (error) {
            console.error('Error in GraphCypherQAChain:', error)
            if (shouldStreamResponse) {
                streamResponse(sseStreamer, chatId, error.message)
            }
            return formatResponse(`Error: ${error.message}`)
        }
    }
}

module.exports = {
    nodeClass: GraphCypherQA_Chain,
    // Export security functions for testing
    sanitizeUserInput,
    detectPromptInjection,
    validateCypherQuery
}
