import {
    ICommonObject,
    IDatabaseEntity,
    INode,
    INodeData,
    INodeOptionsValue,
    INodeParams,
    IServerSideEventStreamer
} from '../../../src/Interface'
import axios, { AxiosRequestConfig } from 'axios'
import { getCredentialData, getCredentialParam, processTemplateVariables, parseJsonBody } from '../../../src/utils'
import { DataSource } from 'typeorm'
import { BaseMessageLike } from '@langchain/core/messages'
import { updateFlowState } from '../utils'

class ExecuteFlow_Agentflow implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    color: string
    baseClasses: string[]
    documentation?: string
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'Execute Flow'
        this.name = 'executeFlowAgentflow'
        this.version = 1.2
        this.type = 'ExecuteFlow'
        this.category = 'Agent Flows'
        this.description = 'Execute another flow'
        this.baseClasses = [this.type]
        this.color = '#a3b18a'
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['chatflowApi'],
            optional: true
        }
        this.inputs = [
            {
                label: 'Select Flow',
                name: 'executeFlowSelectedFlow',
                type: 'asyncOptions',
                loadMethod: 'listFlows'
            },
            {
                label: 'Input',
                name: 'executeFlowInput',
                type: 'string',
                rows: 4,
                acceptVariable: true
            },
            {
                label: 'Override Config',
                name: 'executeFlowOverrideConfig',
                description: 'Override the config passed to the flow',
                type: 'json',
                optional: true,
                acceptVariable: true
            },
            {
                label: 'Base URL',
                name: 'executeFlowBaseURL',
                type: 'string',
                description:
                    'Base URL to Flowise. By default, it is the URL of the incoming request. Useful when you need to execute flow through an alternative route.',
                placeholder: 'http://localhost:3000',
                optional: true
            },
            {
                label: 'Return Response As',
                name: 'executeFlowReturnResponseAs',
                type: 'options',
                options: [
                    {
                        label: 'User Message',
                        name: 'userMessage'
                    },
                    {
                        label: 'Assistant Message',
                        name: 'assistantMessage'
                    }
                ],
                default: 'userMessage'
            },
            {
                label: 'Update Flow State',
                name: 'executeFlowUpdateState',
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
        async listFlows(_: INodeData, options: ICommonObject): Promise<INodeOptionsValue[]> {
            const returnData: INodeOptionsValue[] = []

            const appDataSource = options.appDataSource as DataSource
            const databaseEntities = options.databaseEntities as IDatabaseEntity
            if (appDataSource === undefined || !appDataSource) {
                return returnData
            }

            const searchOptions = options.searchOptions || {}
            const chatflows = await appDataSource.getRepository(databaseEntities['ChatFlow']).findBy(searchOptions)

            for (let i = 0; i < chatflows.length; i += 1) {
                let cfType = 'Chatflow'
                if (chatflows[i].type === 'AGENTFLOW') {
                    cfType = 'Agentflow V2'
                } else if (chatflows[i].type === 'MULTIAGENT') {
                    cfType = 'Agentflow V1'
                }
                const data = {
                    label: chatflows[i].name,
                    name: chatflows[i].id,
                    description: cfType
                } as INodeOptionsValue
                returnData.push(data)
            }

            // order by label
            return returnData.sort((a, b) => a.label.localeCompare(b.label))
        },
        async listRuntimeStateKeys(_: INodeData, options: ICommonObject): Promise<INodeOptionsValue[]> {
            const previousNodes = options.previousNodes as ICommonObject[]
            const startAgentflowNode = previousNodes.find((node) => node.name === 'startAgentflow')
            const state = startAgentflowNode?.inputs?.startState as ICommonObject[]
            return state.map((item) => ({ label: item.key, name: item.key }))
        }
    }

    async run(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const baseURL = (nodeData.inputs?.executeFlowBaseURL as string) || (options.baseURL as string)
        const selectedFlowId = nodeData.inputs?.executeFlowSelectedFlow as string
        const flowInput = nodeData.inputs?.executeFlowInput as string
        const returnResponseAs = nodeData.inputs?.executeFlowReturnResponseAs as string
        const _executeFlowUpdateState = nodeData.inputs?.executeFlowUpdateState

        let overrideConfig = nodeData.inputs?.executeFlowOverrideConfig
        if (typeof overrideConfig === 'string' && overrideConfig.startsWith('{') && overrideConfig.endsWith('}')) {
            try {
                overrideConfig = parseJsonBody(overrideConfig)
            } catch (parseError) {
                throw new Error(`Invalid JSON in executeFlowOverrideConfig: ${parseError.message}`)
            }
        }

        const state = options.agentflowRuntime?.state as ICommonObject
        const runtimeChatHistory = (options.agentflowRuntime?.chatHistory as BaseMessageLike[]) ?? []
        const isLastNode = options.isLastNode as boolean
        const sseStreamer: IServerSideEventStreamer | undefined = options.sseStreamer

        try {
            const credentialData = await getCredentialData(nodeData.credential ?? '', options)
            const chatflowApiKey = getCredentialParam('chatflowApiKey', credentialData, nodeData)

            if (selectedFlowId === options.chatflowid) throw new Error('Cannot call the same agentflow!')

            let headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'flowise-tool': 'true'
            }
            if (chatflowApiKey) headers = { ...headers, Authorization: `Bearer ${chatflowApiKey}` }

            const finalUrl = `${baseURL}/api/v1/prediction/${selectedFlowId}`
            const requestConfig: AxiosRequestConfig = {
                method: 'POST',
                url: finalUrl,
                headers,
                data: {
                    question: flowInput,
                    chatId: options.chatId,
                    overrideConfig
                }
            }

            const response = await axios(requestConfig)

            let resultText = ''
            if (response.data.text) resultText = response.data.text
            else if (response.data.json) resultText = '```json\n' + JSON.stringify(response.data.json, null, 2)
            else resultText = JSON.stringify(response.data, null, 2)

            if (isLastNode && sseStreamer) {
                sseStreamer.streamTokenEvent(options.chatId, resultText)
            }

            // Update flow state if needed
            let newState = { ...state }
            if (_executeFlowUpdateState && Array.isArray(_executeFlowUpdateState) && _executeFlowUpdateState.length > 0) {
                newState = updateFlowState(state, _executeFlowUpdateState)
            }

            // Process template variables in state
            newState = processTemplateVariables(newState, resultText)

            // Only add to runtime chat history if this is the first node
            const inputMessages = []
            if (!runtimeChatHistory.length) {
                inputMessages.push({ role: 'user', content: flowInput })
            }

            let returnRole = 'user'
            if (returnResponseAs === 'assistantMessage') {
                returnRole = 'assistant'
            }

            const returnOutput = {
                id: nodeData.id,
                name: this.name,
                input: {
                    messages: [
                        {
                            role: 'user',
                            content: flowInput
                        }
                    ]
                },
                output: {
                    content: resultText
                },
                state: newState,
                chatHistory: [
                    ...inputMessages,
                    {
                        role: returnRole,
                        content: resultText,
                        name: nodeData?.label ? nodeData?.label.toLowerCase().replace(/\s/g, '_').trim() : nodeData?.id
                    }
                ]
            }

            return returnOutput
        } catch (error) {
            console.error('ExecuteFlow Error:', error)

            // Format error response
            const errorResponse: any = {
                id: nodeData.id,
                name: this.name,
                input: {
                    messages: [
                        {
                            role: 'user',
                            content: flowInput
                        }
                    ]
                },
                error: {
                    name: error.name || 'Error',
                    message: error.message || 'An error occurred during the execution of the flow'
                },
                state
            }

            // Add more error details if available
            if (error.response) {
                errorResponse.error.status = error.response.status
                errorResponse.error.statusText = error.response.statusText
                errorResponse.error.data = error.response.data
                errorResponse.error.headers = error.response.headers
            }

            throw new Error(error)
        }
    }
}

module.exports = { nodeClass: ExecuteFlow_Agentflow }
