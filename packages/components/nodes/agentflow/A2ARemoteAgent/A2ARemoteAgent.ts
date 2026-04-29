import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeParams, IServerSideEventStreamer } from '../../../src/Interface'
import { getCredentialData, getCredentialParam, processTemplateVariables } from '../../../src/utils'
import { A2AAbortError, A2AClientWrapper, A2ATaskNotFoundError, StreamEvent, wrapRemoteAgentDataPart } from '../../../src/a2aClient'
import { updateFlowState } from '../utils'
import { BaseMessageLike } from '@langchain/core/messages'

const A2A_TASK_ID_KEY = 'a2a_taskId'
const A2A_CONTEXT_ID_KEY = 'a2a_contextId'

class A2ARemoteAgent_Agentflow implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    category: string
    color: string
    baseClasses: string[]
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'A2A External Agent'
        this.name = 'a2aRemoteAgentAgentflow'
        this.version = 1.0
        this.type = 'A2ARemoteAgent'
        this.category = 'Agent Flows'
        this.description = 'Discover and invoke an external A2A protocol agent'
        this.baseClasses = ['A2ARemoteAgent']
        this.color = '#83C5BE'
        this.credential = {
            label: 'A2A Agent Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['a2aAgentCredential'],
            optional: true
        }
        this.inputs = [
            {
                label: 'Agent Card URL',
                name: 'agentCardUrl',
                type: 'string',
                placeholder: 'https://remote.example.com/.well-known/agent.json'
            },
            {
                label: 'Message',
                name: 'message',
                type: 'string',
                rows: 4,
                acceptVariable: true
            },
            {
                label: 'Skill',
                name: 'skillId',
                type: 'asyncOptions',
                loadMethod: 'listRemoteSkills',
                refresh: true,
                optional: true
            },
            {
                label: 'Streaming',
                name: 'streaming',
                type: 'boolean',
                default: true,
                optional: true
            },
            {
                label: 'Timeout (ms)',
                name: 'timeout',
                type: 'number',
                default: 120000,
                optional: true,
                step: 1000
            },
            {
                label: 'Return Response As',
                name: 'returnResponseAs',
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
                name: 'updateFlowState',
                description: 'Update runtime state during the execution of the workflow',
                type: 'array',
                optional: true,
                acceptVariable: true,
                additionalParams: true,
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
        async listRemoteSkills(nodeData: INodeData, _options: ICommonObject): Promise<INodeOptionsValue[]> {
            const agentCardUrl = nodeData.inputs?.agentCardUrl as string
            if (!agentCardUrl) return []
            const skills = await A2AClientWrapper.listRemoteSkills(agentCardUrl)
            return skills as INodeOptionsValue[]
        },
        async listRuntimeStateKeys(_: INodeData, options: ICommonObject): Promise<INodeOptionsValue[]> {
            const previousNodes = options.previousNodes as ICommonObject[]
            const startAgentflowNode = previousNodes.find((node) => node.name === 'startAgentflow')
            const state = startAgentflowNode?.inputs?.startState as ICommonObject[]
            if (!state) return []
            return state.map((item) => ({ label: item.key, name: item.key }))
        }
    }

    async run(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const agentCardUrl = nodeData.inputs?.agentCardUrl as string
        const message = nodeData.inputs?.message as string
        const skillId = nodeData.inputs?.skillId as string
        const streaming = nodeData.inputs?.streaming as boolean
        const timeout = (nodeData.inputs?.timeout as number) || 120000
        const returnResponseAs = (nodeData.inputs?.returnResponseAs as string) || 'userMessage'
        const _updateFlowState = nodeData.inputs?.updateFlowState

        const state = (options.agentflowRuntime?.state as ICommonObject) || {}
        const runtimeChatHistory = (options.agentflowRuntime?.chatHistory as BaseMessageLike[]) ?? []
        const isLastNode = options.isLastNode as boolean
        const sseStreamer: IServerSideEventStreamer | undefined = options.sseStreamer
        const chatId = options.chatId as string

        // Detect existing multi-turn state
        const existingTaskId = state[A2A_TASK_ID_KEY] as string | undefined
        const existingContextId = state[A2A_CONTEXT_ID_KEY] as string | undefined

        try {
            // Resolve credentials
            let authType: string | undefined
            let apiKey: string | undefined
            let apiKeyHeaderName: string | undefined
            let bearerToken: string | undefined

            if (nodeData.credential) {
                const credentialData = await getCredentialData(nodeData.credential, options)
                authType = getCredentialParam('authType', credentialData, nodeData)
                apiKey = getCredentialParam('apiKey', credentialData, nodeData)
                apiKeyHeaderName = getCredentialParam('apiKeyHeaderName', credentialData, nodeData)
                bearerToken = getCredentialParam('bearerToken', credentialData, nodeData)
            }

            const resolvedMessage = message

            const buildWrapper = () =>
                new A2AClientWrapper({
                    agentCardUrl,
                    authType: authType as 'apiKey' | 'bearer' | undefined,
                    apiKey,
                    apiKeyHeaderName,
                    bearerToken,
                    timeout,
                    abortSignal: options.abortController?.signal
                })

            // Build message options, including stored taskId/contextId on continuation
            const buildMessageOptions = (includeContinuation: boolean) => ({
                skillId,
                ...(includeContinuation && existingTaskId && { taskId: existingTaskId }),
                ...(includeContinuation && existingContextId && { contextId: existingContextId })
            })

            let result: { responseText: string; taskId: string; contextId: string; taskState: string; artifacts: any[] }

            try {
                result = await this.executeAgentCall({
                    wrapper: buildWrapper(),
                    resolvedMessage,
                    messageOptions: buildMessageOptions(true),
                    streaming,
                    isLastNode,
                    sseStreamer,
                    chatId,
                    abortSignal: options.abortController?.signal
                })
            } catch (error: any) {
                // Handle stale task IDs — retry once as a new conversation
                if (error instanceof A2ATaskNotFoundError && (existingTaskId || existingContextId)) {
                    console.warn('[A2ARemoteAgent] Stale taskId/contextId detected, retrying as new conversation')
                    result = await this.executeAgentCall({
                        wrapper: buildWrapper(),
                        resolvedMessage,
                        messageOptions: buildMessageOptions(false),
                        streaming,
                        isLastNode,
                        sseStreamer,
                        chatId,
                        abortSignal: options.abortController?.signal
                    })
                } else {
                    throw error
                }
            }

            const { responseText, taskId, contextId, taskState, artifacts } = result

            // Update flow state if needed
            let newState: ICommonObject = { ...state }
            if (_updateFlowState && Array.isArray(_updateFlowState) && _updateFlowState.length > 0) {
                newState = updateFlowState(state, _updateFlowState)
            }

            newState = processTemplateVariables(newState, responseText)

            // Update or clear multi-turn state based on task state
            if (taskState === 'input-required') {
                if (taskId) newState[A2A_TASK_ID_KEY] = taskId
                if (contextId) newState[A2A_CONTEXT_ID_KEY] = contextId
            } else if (taskState === 'completed') {
                delete newState[A2A_TASK_ID_KEY]
                delete newState[A2A_CONTEXT_ID_KEY]
            }

            const inputMessages: any[] = []
            if (!runtimeChatHistory.length) {
                inputMessages.push({ role: 'user', content: resolvedMessage })
            }

            const returnRole = returnResponseAs === 'assistantMessage' ? 'assistant' : 'user'
            const nodeLabel = nodeData?.label ? nodeData.label.toLowerCase().replace(/\s/g, '_').trim() : nodeData?.id

            const returnOutput = {
                id: nodeData.id,
                name: this.name,
                input: {
                    messages: [
                        {
                            role: 'user',
                            content: resolvedMessage
                        }
                    ]
                },
                output: {
                    content: responseText,
                    a2aTask: {
                        id: taskId,
                        contextId,
                        state: taskState,
                        artifacts
                    }
                },
                state: newState,
                chatHistory: [
                    ...inputMessages,
                    {
                        role: returnRole,
                        content: responseText,
                        name: nodeLabel
                    }
                ]
            }

            return returnOutput
        } catch (error: any) {
            // If the user aborted the agentflow, propagate as an abort cleanly
            // so the agentflow engine can stop without surfacing a generic error.
            if (error instanceof A2AAbortError || options.abortController?.signal?.aborted) {
                console.warn('[A2ARemoteAgent] Request aborted by user')
                const abortErr = new Error('A2A request aborted')
                abortErr.name = 'AbortError'
                throw abortErr
            }

            console.error('A2ARemoteAgent Error:', error)

            const errorResponse: any = {
                id: nodeData.id,
                name: this.name,
                input: {
                    messages: [
                        {
                            role: 'user',
                            content: message
                        }
                    ]
                },
                error: {
                    name: error.name || 'Error',
                    message: error.message || 'An error occurred while calling the A2A remote agent'
                },
                state
            }

            if (error.response) {
                errorResponse.error.status = error.response.status
                errorResponse.error.statusText = error.response.statusText
                errorResponse.error.data = error.response.data
            }

            throw new Error(error.message || 'An error occurred while calling the A2A remote agent')
        }
    }

    private async executeAgentCall(args: {
        wrapper: A2AClientWrapper
        resolvedMessage: string
        messageOptions: { skillId?: string; taskId?: string; contextId?: string }
        streaming: boolean
        isLastNode: boolean
        sseStreamer: IServerSideEventStreamer | undefined
        chatId: string
        abortSignal?: AbortSignal
    }): Promise<{ responseText: string; taskId: string; contextId: string; taskState: string; artifacts: any[] }> {
        const { wrapper, resolvedMessage, messageOptions, streaming, isLastNode, sseStreamer, chatId, abortSignal } = args

        let responseText = ''
        let taskId = ''
        let contextId = ''
        let taskState = ''
        let artifacts: any[] = []

        if (streaming) {
            const stream = wrapper.sendMessageStream(resolvedMessage, messageOptions)

            for await (const event of stream as AsyncIterable<StreamEvent>) {
                if (abortSignal?.aborted) break
                switch (event.type) {
                    case 'artifact':
                        responseText += event.data.text
                        if (isLastNode && sseStreamer) {
                            sseStreamer.streamTokenEvent(chatId, event.data.text)
                        }
                        break
                    case 'status':
                        taskId = event.data.taskId || taskId
                        contextId = event.data.contextId || contextId
                        break
                    case 'completed':
                        taskId = event.data.taskId || taskId
                        contextId = event.data.contextId || contextId
                        taskState = 'completed'
                        if (event.data.task?.artifacts) {
                            artifacts = event.data.task.artifacts
                        }
                        if (!responseText) {
                            const completedText = this.extractStreamEventText(event.data)
                            if (completedText) {
                                responseText = completedText
                                if (isLastNode && sseStreamer) {
                                    sseStreamer.streamTokenEvent(chatId, completedText)
                                }
                            }
                        }
                        break
                    case 'input-required':
                        taskId = event.data.taskId || taskId
                        contextId = event.data.contextId || contextId
                        taskState = 'input-required'
                        if (event.data.message?.parts) {
                            const inputText = this.extractPartsText(event.data.message.parts)
                            if (inputText && !responseText) {
                                responseText = inputText
                                if (isLastNode && sseStreamer) {
                                    sseStreamer.streamTokenEvent(chatId, inputText)
                                }
                            }
                        }
                        break
                    case 'failed':
                        throw new Error(`A2A Agent error: ${event.data.message}`)
                }
            }

            // If the abort fired during streaming, surface as an abort error rather
            // than fabricating a "completed" result.
            if (abortSignal?.aborted) {
                throw new A2AAbortError('A2A streaming request aborted')
            }

            if (!taskState) taskState = 'completed'
        } else {
            const response = await wrapper.sendMessage(resolvedMessage, messageOptions)
            responseText = response.responseText
            taskId = response.taskId
            contextId = response.contextId
            taskState = response.state
            artifacts = response.artifacts

            if (isLastNode && sseStreamer) {
                sseStreamer.streamTokenEvent(chatId, responseText)
            }
        }

        return { responseText, taskId, contextId, taskState, artifacts }
    }

    private extractPartsText(parts: any[]): string {
        if (!parts || !Array.isArray(parts)) return ''
        const texts: string[] = []
        for (const part of parts) {
            if (part.kind === 'text' && part.text) {
                texts.push(part.text)
            } else if (part.kind === 'data' && part.data) {
                // Wrap untrusted JSON in delimiters and truncate so prompt-injection
                // payloads in the remote agent's `data` parts can't blend into LLM
                // context or exhaust it. Mirrors the behavior in `A2AClientWrapper.extractPartsText`.
                texts.push(wrapRemoteAgentDataPart(part.data))
            }
        }
        return texts.join('\n')
    }

    private extractStreamEventText(data: any): string {
        if (!data) return ''

        if (typeof data.text === 'string' && data.text) {
            return data.text
        }

        if (data.message?.parts) {
            const messageText = this.extractPartsText(data.message.parts)
            if (messageText) return messageText
        }

        if (data.task?.status?.message?.parts) {
            const statusText = this.extractPartsText(data.task.status.message.parts)
            if (statusText) return statusText
        }

        return this.extractArtifactsText(data.task?.artifacts)
    }

    private extractArtifactsText(artifacts: any[]): string {
        if (!artifacts || !Array.isArray(artifacts)) return ''
        return artifacts
            .map((artifact) => this.extractPartsText(artifact?.parts))
            .filter(Boolean)
            .join('\n')
    }
}

module.exports = { nodeClass: A2ARemoteAgent_Agentflow }
