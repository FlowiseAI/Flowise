import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import path from 'path'
import * as fs from 'fs'
import { generateAgentflowv2 as generateAgentflowv2_json } from 'flowise-components'
import { z } from 'zod'
import { sysPrompt } from './prompt'
import { databaseEntities } from '../../utils'
import logger from '../../utils/logger'
import { MODE } from '../../Interface'

// Define the Zod schema for Agentflowv2 data structure
const NodeType = z.object({
    id: z.string(),
    type: z.string(),
    position: z.object({
        x: z.number(),
        y: z.number()
    }),
    width: z.number(),
    height: z.number(),
    selected: z.boolean().optional(),
    positionAbsolute: z
        .object({
            x: z.number(),
            y: z.number()
        })
        .optional(),
    dragging: z.boolean().optional(),
    data: z.any().optional(),
    parentNode: z.string().optional()
})

const EdgeType = z.object({
    source: z.string(),
    sourceHandle: z.string(),
    target: z.string(),
    targetHandle: z.string(),
    data: z
        .object({
            sourceColor: z.string().optional(),
            targetColor: z.string().optional(),
            edgeLabel: z.string().optional(),
            isHumanInput: z.boolean().optional()
        })
        .optional(),
    type: z.string().optional(),
    id: z.string()
})

const AgentFlowV2Type = z
    .object({
        description: z.string().optional(),
        usecases: z.array(z.string()).optional(),
        nodes: z.array(NodeType),
        edges: z.array(EdgeType)
    })
    .describe('Generate Agentflowv2 nodes and edges')

// Type for the templates array
type AgentFlowV2Template = z.infer<typeof AgentFlowV2Type>

const getAllAgentFlow2Nodes = async () => {
    const appServer = getRunningExpressApp()
    const nodes = appServer.nodesPool.componentNodes
    const agentFlow2Nodes = []
    for (const node in nodes) {
        if (nodes[node].category === 'Agent Flows') {
            agentFlow2Nodes.push({
                name: nodes[node].name,
                label: nodes[node].label,
                description: nodes[node].description
            })
        }
    }
    return JSON.stringify(agentFlow2Nodes, null, 2)
}

const getAllToolNodes = async () => {
    const appServer = getRunningExpressApp()
    const nodes = appServer.nodesPool.componentNodes
    const toolNodes = []
    const disabled_nodes = process.env.DISABLED_NODES ? process.env.DISABLED_NODES.split(',') : []
    const removeTools = ['chainTool', 'retrieverTool', 'webBrowser', ...disabled_nodes]

    for (const node in nodes) {
        if (nodes[node].category.includes('Tools')) {
            if (removeTools.includes(nodes[node].name)) {
                continue
            }
            toolNodes.push({
                name: nodes[node].name,
                description: nodes[node].description
            })
        }
    }
    return JSON.stringify(toolNodes, null, 2)
}

const getAllAgentflowv2Marketplaces = async () => {
    const templates: AgentFlowV2Template[] = []
    let marketplaceDir = path.join(__dirname, '..', '..', '..', 'marketplaces', 'agentflowsv2')
    let jsonsInDir = fs.readdirSync(marketplaceDir).filter((file) => path.extname(file) === '.json')
    jsonsInDir.forEach((file) => {
        try {
            const filePath = path.join(__dirname, '..', '..', '..', 'marketplaces', 'agentflowsv2', file)
            const fileData = fs.readFileSync(filePath)
            const fileDataObj = JSON.parse(fileData.toString())
            // get rid of the node.data, remain all other properties
            const filteredNodes = fileDataObj.nodes.map((node: any) => {
                return {
                    ...node,
                    data: undefined
                }
            })

            const title = file.split('.json')[0]
            const template = {
                title,
                description: fileDataObj.description || `Template from ${file}`,
                usecases: fileDataObj.usecases || [],
                nodes: filteredNodes,
                edges: fileDataObj.edges
            }

            // Validate template against schema
            const validatedTemplate = AgentFlowV2Type.parse(template)
            templates.push({
                ...validatedTemplate,
                // @ts-ignore
                title: title
            })
        } catch (error) {
            console.error(`Error processing template file ${file}:`, error)
            // Continue with next file instead of failing completely
        }
    })

    // Format templates into the requested string format
    let formattedTemplates = ''
    templates.forEach((template: AgentFlowV2Template, index: number) => {
        formattedTemplates += `Example ${index + 1}: <<${(template as any).title}>> - ${template.description}\n`
        formattedTemplates += `"nodes": [\n`

        // Format nodes with proper indentation
        const nodesJson = JSON.stringify(template.nodes, null, 3)
        // Split by newlines and add 3 spaces to the beginning of each line except the first and last
        const nodesLines = nodesJson.split('\n')
        if (nodesLines.length > 2) {
            formattedTemplates += `   ${nodesLines[0]}\n`
            for (let i = 1; i < nodesLines.length - 1; i++) {
                formattedTemplates += `   ${nodesLines[i]}\n`
            }
            formattedTemplates += `   ${nodesLines[nodesLines.length - 1]}\n`
        } else {
            formattedTemplates += `   ${nodesJson}\n`
        }

        formattedTemplates += `]\n`
        formattedTemplates += `"edges": [\n`

        // Format edges with proper indentation
        const edgesJson = JSON.stringify(template.edges, null, 3)
        // Split by newlines and add tab to the beginning of each line except the first and last
        const edgesLines = edgesJson.split('\n')
        if (edgesLines.length > 2) {
            formattedTemplates += `\t${edgesLines[0]}\n`
            for (let i = 1; i < edgesLines.length - 1; i++) {
                formattedTemplates += `\t${edgesLines[i]}\n`
            }
            formattedTemplates += `\t${edgesLines[edgesLines.length - 1]}\n`
        } else {
            formattedTemplates += `\t${edgesJson}\n`
        }

        formattedTemplates += `]\n\n`
    })

    return formattedTemplates
}

const generateAgentflowv2 = async (question: string, selectedChatModel: Record<string, any>) => {
    try {
        const agentFlow2Nodes = await getAllAgentFlow2Nodes()
        const toolNodes = await getAllToolNodes()
        const marketplaceTemplates = await getAllAgentflowv2Marketplaces()

        const prompt = sysPrompt
            .replace('{agentFlow2Nodes}', agentFlow2Nodes)
            .replace('{marketplaceTemplates}', marketplaceTemplates)
            .replace('{userRequest}', question)
        const options: Record<string, any> = {
            appDataSource: getRunningExpressApp().AppDataSource,
            databaseEntities: databaseEntities,
            logger: logger
        }

        let response

        if (process.env.MODE === MODE.QUEUE) {
            const predictionQueue = getRunningExpressApp().queueManager.getQueue('prediction')
            const job = await predictionQueue.addJob({
                prompt,
                question,
                toolNodes,
                selectedChatModel,
                isAgentFlowGenerator: true
            })
            logger.debug(`[server]: Generated Agentflowv2 Job added to queue: ${job.id}`)
            const queueEvents = predictionQueue.getQueueEvents()
            response = await job.waitUntilFinished(queueEvents)
        } else {
            response = await generateAgentflowv2_json(
                { prompt, componentNodes: getRunningExpressApp().nodesPool.componentNodes, toolNodes, selectedChatModel },
                question,
                options
            )
        }

        try {
            // Try to parse and validate the response if it's a string
            if (typeof response === 'string') {
                const parsedResponse = JSON.parse(response)
                const validatedResponse = AgentFlowV2Type.parse(parsedResponse)
                return validatedResponse
            }
            // If response is already an object
            else if (typeof response === 'object') {
                const validatedResponse = AgentFlowV2Type.parse(response)
                return validatedResponse
            }
            // Unexpected response type
            else {
                throw new Error(`Unexpected response type: ${typeof response}`)
            }
        } catch (parseError) {
            console.error('Failed to parse or validate response:', parseError)
            // If parsing fails, return an error object
            return {
                error: 'Failed to validate response format',
                rawResponse: response
            } as any // Type assertion to avoid type errors
        }
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: generateAgentflowv2 - ${getErrorMessage(error)}`)
    }
}

export default {
    generateAgentflowv2
}
