import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeParams, IServerSideEventStreamer } from '../../../src/Interface'
import { updateFlowState } from '../utils'
import { processTemplateVariables } from '../../../src/utils'
import { Tool } from '@langchain/core/tools'
import { ARTIFACTS_PREFIX, TOOL_ARGS_PREFIX } from '../../../src/agents'
import zodToJsonSchema from 'zod-to-json-schema'

interface IToolInputArgs {
    inputArgName: string
    inputArgValue: string
}

class Tool_Agentflow implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    color: string
    hideOutput: boolean
    hint: string
    baseClasses: string[]
    documentation?: string
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'Tool'
        this.name = 'toolAgentflow'
        this.version = 1.2
        this.type = 'Tool'
        this.category = 'Agent Flows'
        this.description = 'Tools allow LLM to interact with external systems'
        this.baseClasses = [this.type]
        this.color = '#d4a373'
        this.inputs = [
            {
                label: 'Tool',
                name: 'toolAgentflowSelectedTool',
                type: 'asyncOptions',
                loadMethod: 'listTools',
                loadConfig: true
            },
            {
                label: 'Tool Input Arguments',
                name: 'toolInputArgs',
                type: 'array',
                acceptVariable: true,
                refresh: true,
                array: [
                    {
                        label: 'Input Argument Name',
                        name: 'inputArgName',
                        type: 'asyncOptions',
                        loadMethod: 'listToolInputArgs',
                        refresh: true
                    },
                    {
                        label: 'Input Argument Value',
                        name: 'inputArgValue',
                        type: 'string',
                        acceptVariable: true
                    }
                ],
                show: {
                    toolAgentflowSelectedTool: '.+'
                }
            },
            {
                label: 'Update Flow State',
                name: 'toolUpdateState',
                description: 'Update runtime state during the execution of the workflow',
                type: 'array',
                optional: true,
                acceptVariable: true,
                array: [
                    {
                        label: 'Key',
                        name: 'key',
                        type: 'asyncOptions',
                        loadMethod: 'listRuntimeStateKeys'
                    },
                    {
                        label: 'Value',
                        name: 'value',
                        type: 'string',
                        acceptVariable: true,
                        acceptNodeOutputAsVariable: true
                    }
                ]
            }
        ]
    }

    //@ts-ignore
    loadMethods = {
        async listTools(_: INodeData, options: ICommonObject): Promise<INodeOptionsValue[]> {
            const componentNodes = options.componentNodes as {
                [key: string]: INode
            }

            const removeTools = ['chainTool', 'retrieverTool', 'webBrowser']

            const returnOptions: INodeOptionsValue[] = []
            for (const nodeName in componentNodes) {
                const componentNode = componentNodes[nodeName]
                if (componentNode.category === 'Tools' || componentNode.category === 'Tools (MCP)') {
                    if (componentNode.tags?.includes('LlamaIndex')) {
                        continue
                    }
                    if (removeTools.includes(nodeName)) {
                        continue
                    }
                    returnOptions.push({
                        label: componentNode.label,
                        name: nodeName,
                        imageSrc: componentNode.icon
                    })
                }
            }
            return returnOptions
        },
        async listToolInputArgs(nodeData: INodeData, options: ICommonObject): Promise<INodeOptionsValue[]> {
            const currentNode = options.currentNode as ICommonObject
            const selectedTool = (currentNode?.inputs?.selectedTool as string) || (currentNode?.inputs?.toolAgentflowSelectedTool as string)
            const selectedToolConfig =
                (currentNode?.inputs?.selectedToolConfig as ICommonObject) ||
                (currentNode?.inputs?.toolAgentflowSelectedToolConfig as ICommonObject) ||
                {}

            const nodeInstanceFilePath = options.componentNodes[selectedTool].filePath as string

            const nodeModule = await import(nodeInstanceFilePath)
            const newToolNodeInstance = new nodeModule.nodeClass()

            const newNodeData = {
                ...nodeData,
                credential: selectedToolConfig['FLOWISE_CREDENTIAL_ID'],
                inputs: {
                    ...nodeData.inputs,
                    ...selectedToolConfig
                }
            }

            try {
                const toolInstance = (await newToolNodeInstance.init(newNodeData, '', options)) as Tool

                let toolInputArgs: ICommonObject = {}

                if (Array.isArray(toolInstance)) {
                    // Combine schemas from all tools in the array
                    const allProperties = toolInstance.reduce((acc, tool) => {
                        if (tool?.schema) {
                            const schema: Record<string, any> = zodToJsonSchema(tool.schema)
                            return { ...acc, ...(schema.properties || {}) }
                        }
                        return acc
                    }, {})
                    toolInputArgs = { properties: allProperties }
                } else {
                    // Handle single tool instance
                    toolInputArgs = toolInstance.schema ? zodToJsonSchema(toolInstance.schema as any) : {}
                }

                if (toolInputArgs && Object.keys(toolInputArgs).length > 0) {
                    delete toolInputArgs.$schema
                }

                return Object.keys(toolInputArgs.properties || {}).map((item) => ({
                    label: item,
                    name: item,
                    description: toolInputArgs.properties[item].description
                }))
            } catch (e) {
                return []
            }
        },
        async listRuntimeStateKeys(_: INodeData, options: ICommonObject): Promise<INodeOptionsValue[]> {
            const previousNodes = options.previousNodes as ICommonObject[]
            const startAgentflowNode = previousNodes.find((node) => node.name === 'startAgentflow')
            const state = startAgentflowNode?.inputs?.startState as ICommonObject[]
            return state.map((item) => ({ label: item.key, name: item.key }))
        }
    }

    async run(nodeData: INodeData, input: string, options: ICommonObject): Promise<any> {
        const selectedTool = (nodeData.inputs?.selectedTool as string) || (nodeData.inputs?.toolAgentflowSelectedTool as string)
        const selectedToolConfig =
            (nodeData?.inputs?.selectedToolConfig as ICommonObject) ||
            (nodeData?.inputs?.toolAgentflowSelectedToolConfig as ICommonObject) ||
            {}

        const toolInputArgs = nodeData.inputs?.toolInputArgs as IToolInputArgs[]
        const _toolUpdateState = nodeData.inputs?.toolUpdateState

        const state = options.agentflowRuntime?.state as ICommonObject
        const chatId = options.chatId as string
        const isLastNode = options.isLastNode as boolean
        const isStreamable = isLastNode && options.sseStreamer !== undefined

        const abortController = options.abortController as AbortController

        // Update flow state if needed
        let newState = { ...state }
        if (_toolUpdateState && Array.isArray(_toolUpdateState) && _toolUpdateState.length > 0) {
            newState = updateFlowState(state, _toolUpdateState)
        }

        if (!selectedTool) {
            throw new Error('Tool not selected')
        }

        const nodeInstanceFilePath = options.componentNodes[selectedTool].filePath as string
        const nodeModule = await import(nodeInstanceFilePath)
        const newToolNodeInstance = new nodeModule.nodeClass()
        const newNodeData = {
            ...nodeData,
            credential: selectedToolConfig['FLOWISE_CREDENTIAL_ID'],
            inputs: {
                ...nodeData.inputs,
                ...selectedToolConfig
            }
        }
        const toolInstance = (await newToolNodeInstance.init(newNodeData, '', options)) as Tool | Tool[]

        let toolCallArgs: Record<string, any> = {}

        const parseInputValue = (value: string): any => {
            if (typeof value !== 'string') {
                return value
            }

            // Remove escape characters (backslashes before special characters)
            // ex: \["a", "b", "c", "d", "e"\]
            let cleanedValue = value
                .replace(/\\"/g, '"') // \" -> "
                .replace(/\\\\/g, '\\') // \\ -> \
                .replace(/\\\[/g, '[') // \[ -> [
                .replace(/\\\]/g, ']') // \] -> ]
                .replace(/\\\{/g, '{') // \{ -> {
                .replace(/\\\}/g, '}') // \} -> }

            // Try to parse as JSON if it looks like JSON/array
            if (
                (cleanedValue.startsWith('[') && cleanedValue.endsWith(']')) ||
                (cleanedValue.startsWith('{') && cleanedValue.endsWith('}'))
            ) {
                try {
                    return JSON.parse(cleanedValue)
                } catch (e) {
                    // If parsing fails, return the cleaned value
                    return cleanedValue
                }
            }

            return cleanedValue
        }

        if (newToolNodeInstance.transformNodeInputsToToolArgs) {
            const defaultParams = newToolNodeInstance.transformNodeInputsToToolArgs(newNodeData)

            toolCallArgs = {
                ...defaultParams,
                ...toolCallArgs
            }
        }

        for (const item of toolInputArgs) {
            const variableName = item.inputArgName
            const variableValue = item.inputArgValue
            toolCallArgs[variableName] = parseInputValue(variableValue)
        }

        const flowConfig = {
            chatflowId: options.chatflowid,
            sessionId: options.sessionId,
            chatId: options.chatId,
            input: input,
            state: options.agentflowRuntime?.state
        }

        try {
            let toolOutput: string
            if (Array.isArray(toolInstance)) {
                // Execute all tools and combine their outputs
                const outputs = await Promise.all(
                    toolInstance.map((tool) =>
                        //@ts-ignore
                        tool.call(toolCallArgs, { signal: abortController?.signal }, undefined, flowConfig)
                    )
                )
                toolOutput = outputs.join('\n')
            } else {
                //@ts-ignore
                toolOutput = await toolInstance.call(toolCallArgs, { signal: abortController?.signal }, undefined, flowConfig)
            }

            let parsedArtifacts

            // Extract artifacts if present
            if (typeof toolOutput === 'string' && toolOutput.includes(ARTIFACTS_PREFIX)) {
                const [output, artifact] = toolOutput.split(ARTIFACTS_PREFIX)
                toolOutput = output
                try {
                    parsedArtifacts = JSON.parse(artifact)
                } catch (e) {
                    console.error('Error parsing artifacts from tool:', e)
                }
            }

            let toolInput
            if (typeof toolOutput === 'string' && toolOutput.includes(TOOL_ARGS_PREFIX)) {
                const [output, args] = toolOutput.split(TOOL_ARGS_PREFIX)
                toolOutput = output
                try {
                    toolInput = JSON.parse(args)
                } catch (e) {
                    console.error('Error parsing tool input from tool:', e)
                }
            }

            if (typeof toolOutput === 'object') {
                toolOutput = JSON.stringify(toolOutput, null, 2)
            }

            if (isStreamable) {
                const sseStreamer: IServerSideEventStreamer = options.sseStreamer
                sseStreamer.streamTokenEvent(chatId, toolOutput)
            }

            newState = processTemplateVariables(newState, toolOutput)

            const returnOutput = {
                id: nodeData.id,
                name: this.name,
                input: {
                    toolInputArgs: toolInput ?? toolInputArgs,
                    selectedTool: selectedTool
                },
                output: {
                    content: toolOutput,
                    artifacts: parsedArtifacts
                },
                state: newState
            }

            return returnOutput
        } catch (e) {
            throw new Error(e)
        }
    }
}

module.exports = { nodeClass: Tool_Agentflow }
