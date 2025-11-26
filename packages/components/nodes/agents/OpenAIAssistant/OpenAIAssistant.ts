import {
    ICommonObject,
    IDatabaseEntity,
    INode,
    INodeData,
    INodeOptionsValue,
    INodeParams,
    IServerSideEventStreamer,
    IUsedTool
} from '../../../src/Interface'
import OpenAI from 'openai'
import { DataSource } from 'typeorm'
import { getCredentialData, getCredentialParam } from '../../../src/utils'
import fetch from 'node-fetch'
import { flatten, uniqWith, isEqual } from 'lodash'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { AnalyticHandler } from '../../../src/handler'
import { Moderation, checkInputs, streamResponse } from '../../moderation/Moderation'
import { formatResponse } from '../../outputparsers/OutputParserHelpers'
import { addSingleFileToStorage } from '../../../src/storageUtils'
import { DynamicStructuredTool } from '../../tools/OpenAPIToolkit/core'

const lenticularBracketRegex = /【[^】]*】/g
const imageRegex = /<img[^>]*\/>/g

class OpenAIAssistant_Agents implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'OpenAI Assistant'
        this.name = 'openAIAssistant'
        this.version = 4.0
        this.type = 'OpenAIAssistant'
        this.category = 'Agents'
        this.icon = 'assistant.svg'
        this.description = `An agent that uses OpenAI Assistant API to pick the tool and args to call`
        this.baseClasses = [this.type]
        this.inputs = [
            {
                label: 'Select Assistant',
                name: 'selectedAssistant',
                type: 'asyncOptions',
                loadMethod: 'listAssistants'
            },
            {
                label: 'Allowed Tools',
                name: 'tools',
                type: 'Tool',
                list: true
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
                label: 'Tool Choice',
                name: 'toolChoice',
                type: 'string',
                description:
                    'Controls which (if any) tool is called by the model. Can be "none", "auto", "required", or the name of a tool. Refer <a href="https://platform.openai.com/docs/api-reference/runs/createRun#runs-createrun-tool_choice" target="_blank">here</a> for more information',
                placeholder: 'file_search',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Parallel Tool Calls',
                name: 'parallelToolCalls',
                type: 'boolean',
                description: 'Whether to enable parallel function calling during tool use. Defaults to true',
                default: true,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Disable File Download',
                name: 'disableFileDownload',
                type: 'boolean',
                description:
                    'Messages can contain text, images, or files. In some cases, you may want to prevent others from downloading the files. Learn more from OpenAI File Annotation <a target="_blank" href="https://platform.openai.com/docs/assistants/how-it-works/managing-threads-and-messages">docs</a>',
                optional: true,
                additionalParams: true
            }
        ]
    }

    //@ts-ignore
    loadMethods = {
        async listAssistants(_: INodeData, options: ICommonObject): Promise<INodeOptionsValue[]> {
            const returnData: INodeOptionsValue[] = []

            const appDataSource = options.appDataSource as DataSource
            const databaseEntities = options.databaseEntities as IDatabaseEntity

            if (appDataSource === undefined || !appDataSource) {
                return returnData
            }

            const searchOptions = options.searchOptions || {}
            const assistants = await appDataSource.getRepository(databaseEntities['Assistant']).findBy({
                ...searchOptions,
                type: 'OPENAI'
            })

            for (let i = 0; i < assistants.length; i += 1) {
                const assistantDetails = JSON.parse(assistants[i].details)
                const data = {
                    label: assistantDetails.name,
                    name: assistants[i].id,
                    description: assistantDetails.instructions
                } as INodeOptionsValue
                returnData.push(data)
            }
            return returnData
        }
    }

    async init(): Promise<any> {
        return null
    }

    async clearChatMessages(nodeData: INodeData, options: ICommonObject, sessionIdObj: { type: string; id: string }): Promise<void> {
        const selectedAssistantId = nodeData.inputs?.selectedAssistant as string
        const appDataSource = options.appDataSource as DataSource
        const databaseEntities = options.databaseEntities as IDatabaseEntity
        const orgId = options.orgId

        const assistant = await appDataSource.getRepository(databaseEntities['Assistant']).findOneBy({
            id: selectedAssistantId
        })

        if (!assistant) {
            options.logger.error(`[${orgId}]: Assistant ${selectedAssistantId} not found`)
            return
        }

        if (!sessionIdObj) return

        let sessionId = ''
        if (sessionIdObj.type === 'chatId') {
            const chatId = sessionIdObj.id
            const chatmsg = await appDataSource.getRepository(databaseEntities['ChatMessage']).findOneBy({
                chatId
            })
            if (!chatmsg) {
                options.logger.error(`[${orgId}]: Chat Message with Chat Id: ${chatId} not found`)
                return
            }
            sessionId = chatmsg.sessionId
        } else if (sessionIdObj.type === 'threadId') {
            sessionId = sessionIdObj.id
        }

        const credentialData = await getCredentialData(assistant.credential ?? '', options)
        const openAIApiKey = getCredentialParam('openAIApiKey', credentialData, nodeData)
        if (!openAIApiKey) {
            options.logger.error(`[${orgId}]: OpenAI ApiKey not found`)
            return
        }

        const openai = new OpenAI({ apiKey: openAIApiKey })
        options.logger.info(`[${orgId}]: Clearing OpenAI Thread ${sessionId}`)
        try {
            if (sessionId && sessionId.startsWith('thread_')) {
                await openai.beta.threads.del(sessionId)
                options.logger.info(`[${orgId}]: Successfully cleared OpenAI Thread ${sessionId}`)
            } else {
                options.logger.error(`[${orgId}]: Error clearing OpenAI Thread ${sessionId}`)
            }
        } catch (e) {
            options.logger.error(`[${orgId}]: Error clearing OpenAI Thread ${sessionId}`)
        }
    }

    async run(nodeData: INodeData, input: string, options: ICommonObject): Promise<string | object> {
        const selectedAssistantId = nodeData.inputs?.selectedAssistant as string
        const appDataSource = options.appDataSource as DataSource
        const databaseEntities = options.databaseEntities as IDatabaseEntity
        const disableFileDownload = nodeData.inputs?.disableFileDownload as boolean
        const moderations = nodeData.inputs?.inputModeration as Moderation[]
        const _toolChoice = nodeData.inputs?.toolChoice as string
        const parallelToolCalls = nodeData.inputs?.parallelToolCalls as boolean

        const shouldStreamResponse = options.shouldStreamResponse
        const sseStreamer: IServerSideEventStreamer = options.sseStreamer as IServerSideEventStreamer
        const chatId = options.chatId
        const checkStorage = options.checkStorage
            ? (options.checkStorage as (orgId: string, subscriptionId: string, usageCacheManager: any) => Promise<void>)
            : undefined
        const updateStorageUsage = options.updateStorageUsage
            ? (options.updateStorageUsage as (
                  orgId: string,
                  workspaceId: string,
                  totalSize: number,
                  usageCacheManager: any
              ) => Promise<void>)
            : undefined

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

        let tools = nodeData.inputs?.tools
        tools = flatten(tools)
        const formattedTools = tools?.map((tool: any) => formatToOpenAIAssistantTool(tool)) ?? []

        const usedTools: IUsedTool[] = []
        const fileAnnotations = []
        const artifacts = []

        const assistant = await appDataSource.getRepository(databaseEntities['Assistant']).findOneBy({
            id: selectedAssistantId
        })

        if (!assistant) throw new Error(`Assistant ${selectedAssistantId} not found`)

        const credentialData = await getCredentialData(assistant.credential ?? '', options)
        const openAIApiKey = getCredentialParam('openAIApiKey', credentialData, nodeData)
        if (!openAIApiKey) throw new Error(`OpenAI ApiKey not found`)

        const openai = new OpenAI({ apiKey: openAIApiKey })

        // Start analytics
        const analyticHandlers = AnalyticHandler.getInstance(nodeData, options)
        await analyticHandlers.init()
        const parentIds = await analyticHandlers.onChainStart('OpenAIAssistant', input)

        try {
            const assistantDetails = JSON.parse(assistant.details)
            const openAIAssistantId = assistantDetails.id

            // Retrieve assistant
            const retrievedAssistant = await openai.beta.assistants.retrieve(openAIAssistantId)

            if (formattedTools.length) {
                let filteredTools = []
                for (const tool of retrievedAssistant.tools) {
                    if (tool.type === 'code_interpreter' || tool.type === 'file_search') filteredTools.push(tool)
                }
                filteredTools = uniqWith([...filteredTools, ...formattedTools], isEqual)
                // filter out tool with empty function
                filteredTools = filteredTools.filter((tool) => !(tool.type === 'function' && !(tool as any).function))
                await openai.beta.assistants.update(openAIAssistantId, { tools: filteredTools })
            } else {
                let filteredTools = retrievedAssistant.tools.filter((tool) => tool.type !== 'function')
                await openai.beta.assistants.update(openAIAssistantId, { tools: filteredTools })
            }

            const chatmessage = await appDataSource.getRepository(databaseEntities['ChatMessage']).findOneBy({
                chatId: options.chatId,
                chatflowid: options.chatflowid
            })

            let threadId = ''
            let isNewThread = false
            if (!chatmessage) {
                const thread = await openai.beta.threads.create({})
                threadId = thread.id
                isNewThread = true
            } else {
                const thread = await openai.beta.threads.retrieve(chatmessage.sessionId)
                threadId = thread.id
            }

            // List all runs, in case existing thread is still running
            if (!isNewThread) {
                const promise = (threadId: string) => {
                    return new Promise<void>((resolve, reject) => {
                        const maxWaitTime = 30000 // Maximum wait time of 30 seconds
                        const startTime = Date.now()
                        let delay = 500 // Initial delay between retries
                        const maxRetries = 10
                        let retries = 0

                        const timeout = setInterval(async () => {
                            try {
                                const allRuns = await openai.beta.threads.runs.list(threadId)
                                if (allRuns.data && allRuns.data.length) {
                                    const firstRunId = allRuns.data[0].id
                                    const runStatus = allRuns.data.find((run) => run.id === firstRunId)?.status
                                    if (
                                        runStatus &&
                                        (runStatus === 'cancelled' ||
                                            runStatus === 'completed' ||
                                            runStatus === 'expired' ||
                                            runStatus === 'failed' ||
                                            runStatus === 'requires_action')
                                    ) {
                                        clearInterval(timeout)
                                        resolve()
                                    }
                                } else {
                                    clearInterval(timeout)
                                    reject(new Error(`Empty Thread: ${threadId}`))
                                }
                            } catch (error: any) {
                                if (error.response?.status === 404) {
                                    clearInterval(timeout)
                                    reject(new Error(`Thread not found: ${threadId}`))
                                } else if (error.response?.status === 429 && retries < maxRetries) {
                                    retries++
                                    delay *= 2
                                    console.warn(`Rate limit exceeded, retrying in ${delay}ms...`)
                                } else {
                                    clearInterval(timeout)
                                    reject(new Error(`Unexpected error: ${error.message}`))
                                }
                            }

                            // Timeout condition to stop the loop if maxWaitTime is exceeded
                            if (Date.now() - startTime > maxWaitTime) {
                                clearInterval(timeout)
                                reject(new Error('Timeout waiting for thread to finish.'))
                            }
                        }, delay)
                    })
                }
                await promise(threadId)
            }

            // Add message to thread
            await openai.beta.threads.messages.create(threadId, {
                role: 'user',
                content: input
            })

            // Run assistant thread
            const llmIds = await analyticHandlers.onLLMStart('ChatOpenAI', input, parentIds)

            let text = ''
            let runThreadId = ''
            let isStreamingStarted = false

            let toolChoice: any
            if (_toolChoice) {
                if (_toolChoice === 'file_search') {
                    toolChoice = { type: 'file_search' }
                } else if (_toolChoice === 'code_interpreter') {
                    toolChoice = { type: 'code_interpreter' }
                } else if (_toolChoice === 'none' || _toolChoice === 'auto' || _toolChoice === 'required') {
                    toolChoice = _toolChoice
                } else {
                    toolChoice = { type: 'function', function: { name: _toolChoice } }
                }
            }

            if (shouldStreamResponse) {
                const streamThread = await openai.beta.threads.runs.create(threadId, {
                    assistant_id: retrievedAssistant.id,
                    stream: true,
                    tool_choice: toolChoice,
                    parallel_tool_calls: parallelToolCalls
                })

                for await (const event of streamThread) {
                    if (event.event === 'thread.run.created') {
                        runThreadId = event.data.id
                    }

                    if (event.event === 'thread.message.delta') {
                        const chunk = event.data.delta.content?.[0]

                        if (chunk && 'text' in chunk) {
                            if (chunk.text?.annotations?.length) {
                                const message_content = chunk.text
                                const annotations = chunk.text?.annotations

                                // Iterate over the annotations
                                for (let index = 0; index < annotations.length; index++) {
                                    const annotation = annotations[index]
                                    let filePath = ''

                                    // Gather citations based on annotation attributes
                                    const file_citation = (annotation as OpenAI.Beta.Threads.Messages.FileCitationAnnotation).file_citation
                                    if (file_citation) {
                                        const cited_file = await openai.files.retrieve(file_citation.file_id)
                                        // eslint-disable-next-line no-useless-escape
                                        const fileName = cited_file.filename.split(/[\/\\]/).pop() ?? cited_file.filename
                                        if (!disableFileDownload) {
                                            if (checkStorage)
                                                await checkStorage(options.orgId, options.subscriptionId, options.usageCacheManager)

                                            const { path, totalSize } = await downloadFile(
                                                openAIApiKey,
                                                cited_file,
                                                fileName,
                                                options.orgId,
                                                options.chatflowid,
                                                options.chatId
                                            )
                                            filePath = path
                                            fileAnnotations.push({
                                                filePath,
                                                fileName
                                            })

                                            if (updateStorageUsage)
                                                await updateStorageUsage(
                                                    options.orgId,
                                                    options.workspaceId,
                                                    totalSize,
                                                    options.usageCacheManager
                                                )
                                        }
                                    } else {
                                        const file_path = (annotation as OpenAI.Beta.Threads.Messages.FilePathAnnotation).file_path
                                        if (file_path) {
                                            const cited_file = await openai.files.retrieve(file_path.file_id)
                                            // eslint-disable-next-line no-useless-escape
                                            const fileName = cited_file.filename.split(/[\/\\]/).pop() ?? cited_file.filename
                                            if (!disableFileDownload) {
                                                if (checkStorage)
                                                    await checkStorage(options.orgId, options.subscriptionId, options.usageCacheManager)

                                                const { path, totalSize } = await downloadFile(
                                                    openAIApiKey,
                                                    cited_file,
                                                    fileName,
                                                    options.orgId,
                                                    options.chatflowid,
                                                    options.chatId
                                                )
                                                filePath = path
                                                fileAnnotations.push({
                                                    filePath,
                                                    fileName
                                                })

                                                if (updateStorageUsage)
                                                    await updateStorageUsage(
                                                        options.orgId,
                                                        options.workspaceId,
                                                        totalSize,
                                                        options.usageCacheManager
                                                    )
                                            }
                                        }
                                    }

                                    // Replace the text with a footnote
                                    message_content.value = message_content.value?.replace(
                                        `${annotation.text}`,
                                        `${disableFileDownload ? '' : filePath}`
                                    )
                                }

                                // Remove lenticular brackets
                                message_content.value = message_content.value?.replace(lenticularBracketRegex, '')

                                text += message_content.value ?? ''

                                if (message_content.value) {
                                    if (!isStreamingStarted) {
                                        isStreamingStarted = true
                                        if (sseStreamer) {
                                            sseStreamer.streamStartEvent(chatId, message_content.value)
                                        }
                                    }
                                    if (sseStreamer) {
                                        sseStreamer.streamTokenEvent(chatId, message_content.value)
                                    }
                                }

                                if (fileAnnotations.length) {
                                    if (!isStreamingStarted) {
                                        isStreamingStarted = true
                                        if (sseStreamer) {
                                            sseStreamer.streamStartEvent(chatId, ' ')
                                        }
                                    }
                                    if (sseStreamer) {
                                        sseStreamer.streamFileAnnotationsEvent(chatId, fileAnnotations)
                                    }
                                }
                            } else {
                                text += chunk.text?.value
                                if (!isStreamingStarted) {
                                    isStreamingStarted = true
                                    if (sseStreamer) {
                                        sseStreamer.streamStartEvent(chatId, chunk.text?.value || '')
                                    }
                                }
                                if (sseStreamer) {
                                    sseStreamer.streamTokenEvent(chatId, chunk.text?.value || '')
                                }
                            }
                        }

                        if (chunk && 'image_file' in chunk && chunk.image_file?.file_id) {
                            const fileId = chunk.image_file.file_id
                            const fileObj = await openai.files.retrieve(fileId)

                            if (checkStorage) await checkStorage(options.orgId, options.subscriptionId, options.usageCacheManager)

                            const { filePath, totalSize } = await downloadImg(
                                openai,
                                fileId,
                                `${fileObj.filename}.png`,
                                options.orgId,
                                options.chatflowid,
                                options.chatId
                            )
                            artifacts.push({ type: 'png', data: filePath })

                            if (updateStorageUsage)
                                await updateStorageUsage(options.orgId, options.workspaceId, totalSize, options.usageCacheManager)

                            if (!isStreamingStarted) {
                                isStreamingStarted = true
                                if (sseStreamer) {
                                    sseStreamer.streamStartEvent(chatId, ' ')
                                }
                            }
                            if (sseStreamer) {
                                sseStreamer.streamArtifactsEvent(chatId, artifacts)
                            }
                        }
                    }

                    if (event.event === 'thread.run.requires_action') {
                        if (event.data.required_action?.submit_tool_outputs.tool_calls) {
                            const actions: ICommonObject[] = []
                            event.data.required_action.submit_tool_outputs.tool_calls.forEach((item) => {
                                const functionCall = item.function
                                let args = {}
                                try {
                                    args = JSON.parse(functionCall.arguments)
                                } catch (e) {
                                    console.error('Error parsing arguments, default to empty object')
                                }
                                actions.push({
                                    tool: functionCall.name,
                                    toolInput: args,
                                    toolCallId: item.id
                                })
                            })
                            const submitToolOutputs = []
                            for (let i = 0; i < actions.length; i += 1) {
                                const tool = tools.find((tool: any) => tool.name === actions[i].tool)
                                if (!tool) continue

                                // Start tool analytics
                                const toolIds = await analyticHandlers.onToolStart(tool.name, actions[i].toolInput, parentIds)

                                try {
                                    const toolOutput = await tool.call(actions[i].toolInput, undefined, undefined, {
                                        sessionId: threadId,
                                        chatId: options.chatId,
                                        input
                                    })
                                    await analyticHandlers.onToolEnd(toolIds, toolOutput)
                                    submitToolOutputs.push({
                                        tool_call_id: actions[i].toolCallId,
                                        output: toolOutput
                                    })
                                    usedTools.push({
                                        tool: tool.name,
                                        toolInput: actions[i].toolInput,
                                        toolOutput
                                    })
                                } catch (e) {
                                    await analyticHandlers.onToolError(toolIds, e)
                                    console.error('Error executing tool', e)
                                    throw new Error(
                                        `Error executing tool. Tool: ${tool.name}. Thread ID: ${threadId}. Run ID: ${runThreadId}`
                                    )
                                }
                            }

                            try {
                                await handleToolSubmission({
                                    openai,
                                    threadId,
                                    runThreadId,
                                    submitToolOutputs,
                                    tools,
                                    analyticHandlers,
                                    parentIds,
                                    llmIds,
                                    sseStreamer,
                                    chatId,
                                    options,
                                    input,
                                    usedTools,
                                    text,
                                    isStreamingStarted
                                })
                            } catch (error) {
                                console.error('Error submitting tool outputs:', error)
                                await openai.beta.threads.runs.cancel(threadId, runThreadId)

                                const errMsg = `Error submitting tool outputs. Thread ID: ${threadId}. Run ID: ${runThreadId}`

                                await analyticHandlers.onLLMError(llmIds, errMsg)
                                await analyticHandlers.onChainError(parentIds, errMsg, true)

                                throw new Error(errMsg)
                            }
                        }
                    }
                }

                // List messages
                const messages = await openai.beta.threads.messages.list(threadId)
                const messageData = messages.data ?? []
                const assistantMessages = messageData.filter((msg) => msg.role === 'assistant')
                if (!assistantMessages.length) return ''

                // Remove images from the logging text
                let llmOutput = text.replace(imageRegex, '')
                llmOutput = llmOutput.replace('<br/>', '')

                await analyticHandlers.onLLMEnd(llmIds, llmOutput)
                await analyticHandlers.onChainEnd(parentIds, messageData, true)

                return {
                    text,
                    usedTools,
                    artifacts,
                    fileAnnotations,
                    assistant: { assistantId: openAIAssistantId, threadId, runId: runThreadId, messages: messageData }
                }
            }

            const promise = (threadId: string, runId: string) => {
                return new Promise((resolve, reject) => {
                    const maxWaitTime = 30000 // Maximum wait time of 30 seconds
                    const startTime = Date.now()
                    let delay = 500 // Initial delay between retries
                    const maxRetries = 10
                    let retries = 0

                    const timeout = setInterval(async () => {
                        try {
                            const run = await openai.beta.threads.runs.retrieve(threadId, runId)
                            const state = run.status

                            if (state === 'completed') {
                                clearInterval(timeout)
                                resolve(state)
                            } else if (state === 'requires_action') {
                                if (run.required_action?.submit_tool_outputs.tool_calls) {
                                    clearInterval(timeout)
                                    const actions: ICommonObject[] = []
                                    run.required_action.submit_tool_outputs.tool_calls.forEach((item) => {
                                        const functionCall = item.function
                                        let args = {}
                                        try {
                                            args = JSON.parse(functionCall.arguments)
                                        } catch (e) {
                                            console.error('Error parsing arguments, default to empty object')
                                        }
                                        actions.push({
                                            tool: functionCall.name,
                                            toolInput: args,
                                            toolCallId: item.id
                                        })
                                    })
                                    const submitToolOutputs = []
                                    for (let i = 0; i < actions.length; i += 1) {
                                        const tool = tools.find((tool: any) => tool.name === actions[i].tool)
                                        if (!tool) continue

                                        // Start tool analytics
                                        const toolIds = await analyticHandlers.onToolStart(tool.name, actions[i].toolInput, parentIds)
                                        if (shouldStreamResponse && sseStreamer) {
                                            sseStreamer.streamToolEvent(chatId, tool.name)
                                        }

                                        try {
                                            const toolOutput = await tool.call(actions[i].toolInput, undefined, undefined, {
                                                sessionId: threadId,
                                                chatId: options.chatId,
                                                input
                                            })
                                            await analyticHandlers.onToolEnd(toolIds, toolOutput)
                                            submitToolOutputs.push({
                                                tool_call_id: actions[i].toolCallId,
                                                output: toolOutput
                                            })
                                            usedTools.push({
                                                tool: tool.name,
                                                toolInput: actions[i].toolInput,
                                                toolOutput
                                            })
                                        } catch (e) {
                                            await analyticHandlers.onToolError(toolIds, e)
                                            console.error('Error executing tool', e)
                                            clearInterval(timeout)
                                            reject(
                                                new Error(
                                                    `Error processing thread: ${state}, Thread ID: ${threadId}, Run ID: ${runId}, Tool: ${tool.name}`
                                                )
                                            )
                                            return
                                        }
                                    }

                                    const newRun = await openai.beta.threads.runs.retrieve(threadId, runId)
                                    const newStatus = newRun?.status

                                    try {
                                        if (submitToolOutputs.length && newStatus === 'requires_action') {
                                            await openai.beta.threads.runs.submitToolOutputs(threadId, runId, {
                                                tool_outputs: submitToolOutputs
                                            })
                                            resolve(state)
                                        } else {
                                            await openai.beta.threads.runs.cancel(threadId, runId)
                                            resolve('requires_action_retry')
                                        }
                                    } catch (e) {
                                        clearInterval(timeout)
                                        reject(
                                            new Error(`Error submitting tool outputs: ${state}, Thread ID: ${threadId}, Run ID: ${runId}`)
                                        )
                                    }
                                }
                            } else if (state === 'cancelled' || state === 'expired' || state === 'failed') {
                                clearInterval(timeout)
                                reject(
                                    new Error(
                                        `Error processing thread: ${state}, Thread ID: ${threadId}, Run ID: ${runId}, Status: ${state}`
                                    )
                                )
                            }
                        } catch (error: any) {
                            if (error.response?.status === 404 || error.response?.status === 429) {
                                clearInterval(timeout)
                                reject(new Error(`API error: ${error.response?.status} for Thread ID: ${threadId}, Run ID: ${runId}`))
                            } else if (retries < maxRetries) {
                                retries++
                                delay *= 2 // Exponential backoff
                                console.warn(`Transient error, retrying in ${delay}ms...`)
                            } else {
                                clearInterval(timeout)
                                reject(new Error(`Max retries reached. Error: ${error.message}`))
                            }
                        }

                        // Stop the loop if maximum wait time is exceeded
                        if (Date.now() - startTime > maxWaitTime) {
                            clearInterval(timeout)
                            reject(new Error('Timeout waiting for thread to finish.'))
                        }
                    }, delay)
                })
            }

            // Polling run status
            const runThread = await openai.beta.threads.runs.create(threadId, {
                assistant_id: retrievedAssistant.id,
                tool_choice: toolChoice,
                parallel_tool_calls: parallelToolCalls
            })
            runThreadId = runThread.id
            let state = await promise(threadId, runThread.id)
            while (state === 'requires_action') {
                state = await promise(threadId, runThread.id)
            }

            let retries = 3
            while (state === 'requires_action_retry') {
                if (retries > 0) {
                    retries -= 1
                    const newRunThread = await openai.beta.threads.runs.create(threadId, {
                        assistant_id: retrievedAssistant.id,
                        tool_choice: toolChoice,
                        parallel_tool_calls: parallelToolCalls
                    })
                    runThreadId = newRunThread.id
                    state = await promise(threadId, newRunThread.id)
                } else {
                    const errMsg = `Error processing thread: ${state}, Thread ID: ${threadId}`
                    await analyticHandlers.onChainError(parentIds, errMsg, true)
                    throw new Error(errMsg)
                }
            }

            // List messages
            const messages = await openai.beta.threads.messages.list(threadId)
            const messageData = messages.data ?? []
            const assistantMessages = messageData.filter((msg) => msg.role === 'assistant')
            if (!assistantMessages.length) return ''

            let returnVal = ''
            for (let i = 0; i < assistantMessages[0].content.length; i += 1) {
                if (assistantMessages[0].content[i].type === 'text') {
                    const content = assistantMessages[0].content[i] as OpenAI.Beta.Threads.Messages.TextContentBlock

                    if (content.text.annotations) {
                        const message_content = content.text
                        const annotations = message_content.annotations

                        // Iterate over the annotations
                        for (let index = 0; index < annotations.length; index++) {
                            const annotation = annotations[index]
                            let filePath = ''

                            // Gather citations based on annotation attributes
                            const file_citation = (annotation as OpenAI.Beta.Threads.Messages.FileCitationAnnotation).file_citation

                            if (file_citation) {
                                const cited_file = await openai.files.retrieve(file_citation.file_id)
                                // eslint-disable-next-line no-useless-escape
                                const fileName = cited_file.filename.split(/[\/\\]/).pop() ?? cited_file.filename
                                if (!disableFileDownload) {
                                    if (checkStorage) await checkStorage(options.orgId, options.subscriptionId, options.usageCacheManager)

                                    const { path, totalSize } = await downloadFile(
                                        openAIApiKey,
                                        cited_file,
                                        fileName,
                                        options.orgId,
                                        options.chatflowid,
                                        options.chatId
                                    )
                                    filePath = path

                                    if (updateStorageUsage)
                                        await updateStorageUsage(options.orgId, options.workspaceId, totalSize, options.usageCacheManager)

                                    fileAnnotations.push({
                                        filePath,
                                        fileName
                                    })
                                }
                            } else {
                                const file_path = (annotation as OpenAI.Beta.Threads.Messages.FilePathAnnotation).file_path
                                if (file_path) {
                                    const cited_file = await openai.files.retrieve(file_path.file_id)
                                    // eslint-disable-next-line no-useless-escape
                                    const fileName = cited_file.filename.split(/[\/\\]/).pop() ?? cited_file.filename
                                    if (!disableFileDownload) {
                                        if (checkStorage)
                                            await checkStorage(options.orgId, options.subscriptionId, options.usageCacheManager)

                                        const { path, totalSize } = await downloadFile(
                                            openAIApiKey,
                                            cited_file,
                                            fileName,
                                            options.orgId,
                                            options.chatflowid,
                                            options.chatId
                                        )
                                        filePath = path

                                        if (updateStorageUsage)
                                            await updateStorageUsage(
                                                options.orgId,
                                                options.workspaceId,
                                                totalSize,
                                                options.usageCacheManager
                                            )

                                        fileAnnotations.push({
                                            filePath,
                                            fileName
                                        })
                                    }
                                }
                            }

                            // Replace the text with a footnote
                            message_content.value = message_content.value.replace(
                                `${annotation.text}`,
                                `${disableFileDownload ? '' : filePath}`
                            )
                        }

                        returnVal += message_content.value
                    } else {
                        returnVal += content.text.value
                    }

                    returnVal = returnVal.replace(lenticularBracketRegex, '')
                } else {
                    const content = assistantMessages[0].content[i] as OpenAI.Beta.Threads.Messages.ImageFileContentBlock
                    const fileId = content.image_file.file_id
                    const fileObj = await openai.files.retrieve(fileId)

                    if (checkStorage) await checkStorage(options.orgId, options.subscriptionId, options.usageCacheManager)

                    const { filePath, totalSize } = await downloadImg(
                        openai,
                        fileId,
                        `${fileObj.filename}.png`,
                        options.orgId,
                        options.chatflowid,
                        options.chatId
                    )

                    if (updateStorageUsage)
                        await updateStorageUsage(options.orgId, options.workspaceId, totalSize, options.usageCacheManager)

                    artifacts.push({ type: 'png', data: filePath })
                }
            }

            let llmOutput = returnVal.replace(imageRegex, '')
            llmOutput = llmOutput.replace('<br/>', '')

            await analyticHandlers.onLLMEnd(llmIds, llmOutput)
            await analyticHandlers.onChainEnd(parentIds, messageData, true)

            return {
                text: returnVal,
                usedTools,
                artifacts,
                fileAnnotations,
                assistant: { assistantId: openAIAssistantId, threadId, runId: runThreadId, messages: messageData }
            }
        } catch (error) {
            await analyticHandlers.onChainError(parentIds, error, true)
            throw new Error(error)
        }
    }
}

const downloadImg = async (
    openai: OpenAI,
    fileId: string,
    fileName: string,
    orgId: string,
    ...paths: string[]
): Promise<{ filePath: string; totalSize: number }> => {
    const response = await openai.files.content(fileId)

    // Extract the binary data from the Response object
    const image_data = await response.arrayBuffer()

    // Convert the binary data to a Buffer
    const image_data_buffer = Buffer.from(image_data)
    const mime = 'image/png'

    const { path, totalSize } = await addSingleFileToStorage(mime, image_data_buffer, fileName, orgId, ...paths)

    return { filePath: path, totalSize }
}

const downloadFile = async (
    openAIApiKey: string,
    fileObj: any,
    fileName: string,
    orgId: string,
    ...paths: string[]
): Promise<{ path: string; totalSize: number }> => {
    try {
        const response = await fetch(`https://api.openai.com/v1/files/${fileObj.id}/content`, {
            method: 'GET',
            headers: { Accept: '*/*', Authorization: `Bearer ${openAIApiKey}` }
        })

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        // Extract the binary data from the Response object
        const data = await response.arrayBuffer()

        // Convert the binary data to a Buffer
        const data_buffer = Buffer.from(data)
        const mime = 'application/octet-stream'

        const { path, totalSize } = await addSingleFileToStorage(mime, data_buffer, fileName, orgId, ...paths)

        return { path, totalSize }
    } catch (error) {
        console.error('Error downloading or writing the file:', error)
        return { path: '', totalSize: 0 }
    }
}

interface ToolSubmissionParams {
    openai: OpenAI
    threadId: string
    runThreadId: string
    submitToolOutputs: any[]
    tools: any[]
    analyticHandlers: AnalyticHandler
    parentIds: ICommonObject
    llmIds: ICommonObject
    sseStreamer: IServerSideEventStreamer
    chatId: string
    options: ICommonObject
    input: string
    usedTools: IUsedTool[]
    text: string
    isStreamingStarted: boolean
}

interface ToolSubmissionResult {
    text: string
    isStreamingStarted: boolean
}

async function handleToolSubmission(params: ToolSubmissionParams): Promise<ToolSubmissionResult> {
    const {
        openai,
        threadId,
        runThreadId,
        submitToolOutputs,
        tools,
        analyticHandlers,
        parentIds,
        llmIds,
        sseStreamer,
        chatId,
        options,
        input,
        usedTools
    } = params

    let updatedText = params.text
    let updatedIsStreamingStarted = params.isStreamingStarted

    const stream = openai.beta.threads.runs.submitToolOutputsStream(threadId, runThreadId, {
        tool_outputs: submitToolOutputs
    })

    try {
        for await (const event of stream) {
            if (event.event === 'thread.message.delta') {
                const chunk = event.data.delta.content?.[0]
                if (chunk && 'text' in chunk && chunk.text?.value) {
                    updatedText += chunk.text.value
                    if (!updatedIsStreamingStarted) {
                        updatedIsStreamingStarted = true
                        if (sseStreamer) {
                            sseStreamer.streamStartEvent(chatId, chunk.text.value)
                        }
                    }
                    if (sseStreamer) {
                        sseStreamer.streamTokenEvent(chatId, chunk.text.value)
                    }
                }
            } else if (event.event === 'thread.run.requires_action') {
                if (event.data.required_action?.submit_tool_outputs.tool_calls) {
                    const actions: ICommonObject[] = []

                    event.data.required_action.submit_tool_outputs.tool_calls.forEach((item) => {
                        const functionCall = item.function
                        let args = {}
                        try {
                            args = JSON.parse(functionCall.arguments)
                        } catch (e) {
                            console.error('Error parsing arguments, default to empty object')
                        }
                        actions.push({
                            tool: functionCall.name,
                            toolInput: args,
                            toolCallId: item.id
                        })
                    })

                    const nestedToolOutputs = []
                    for (let i = 0; i < actions.length; i += 1) {
                        const tool = tools.find((tool: any) => tool.name === actions[i].tool)
                        if (!tool) continue

                        const toolIds = await analyticHandlers.onToolStart(tool.name, actions[i].toolInput, parentIds)

                        try {
                            const toolOutput = await tool.call(actions[i].toolInput, undefined, undefined, {
                                sessionId: threadId,
                                chatId: options.chatId,
                                input
                            })
                            await analyticHandlers.onToolEnd(toolIds, toolOutput)
                            nestedToolOutputs.push({
                                tool_call_id: actions[i].toolCallId,
                                output: toolOutput
                            })
                            usedTools.push({
                                tool: tool.name,
                                toolInput: actions[i].toolInput,
                                toolOutput
                            })
                        } catch (e) {
                            await analyticHandlers.onToolError(toolIds, e)
                            console.error('Error executing tool', e)
                            throw new Error(`Error executing tool. Tool: ${tool.name}. Thread ID: ${threadId}. Run ID: ${runThreadId}`)
                        }
                    }

                    // Recursively handle nested tool submissions
                    const result = await handleToolSubmission({
                        openai,
                        threadId,
                        runThreadId,
                        submitToolOutputs: nestedToolOutputs,
                        tools,
                        analyticHandlers,
                        parentIds,
                        llmIds,
                        sseStreamer,
                        chatId,
                        options,
                        input,
                        usedTools,
                        text: updatedText,
                        isStreamingStarted: updatedIsStreamingStarted
                    })
                    updatedText = result.text
                    updatedIsStreamingStarted = result.isStreamingStarted
                }
            }
        }

        if (sseStreamer) {
            sseStreamer.streamUsedToolsEvent(chatId, usedTools)
        }

        return {
            text: updatedText,
            isStreamingStarted: updatedIsStreamingStarted
        }
    } catch (error) {
        console.error('Error submitting tool outputs:', error)
        await openai.beta.threads.runs.cancel(threadId, runThreadId)

        const errMsg = `Error submitting tool outputs. Thread ID: ${threadId}. Run ID: ${runThreadId}`

        await analyticHandlers.onLLMError(llmIds, errMsg)
        await analyticHandlers.onChainError(parentIds, errMsg, true)

        throw new Error(errMsg)
    }
}

interface JSONSchema {
    type?: string
    properties?: Record<string, JSONSchema>
    additionalProperties?: boolean
    required?: string[]
    [key: string]: any
}

const formatToOpenAIAssistantTool = (tool: any): OpenAI.Beta.FunctionTool => {
    const parameters = zodToJsonSchema(tool.schema) as JSONSchema

    // For strict tools, we need to:
    // 1. Set additionalProperties to false
    // 2. Make all parameters required
    // 3. Set the strict flag
    if (tool instanceof DynamicStructuredTool && tool.isStrict()) {
        // Get all property names from the schema
        const properties = parameters.properties || {}
        const allPropertyNames = Object.keys(properties)

        parameters.additionalProperties = false
        parameters.required = allPropertyNames

        // Handle nested objects
        for (const [_, prop] of Object.entries(properties)) {
            if (prop.type === 'object') {
                prop.additionalProperties = false
                if (prop.properties) {
                    prop.required = Object.keys(prop.properties)
                }
            }
        }
    }

    const functionTool: OpenAI.Beta.FunctionTool = {
        type: 'function',
        function: {
            name: tool.name,
            description: tool.description,
            parameters
        }
    }

    // Add strict property if the tool is marked as strict
    if (tool instanceof DynamicStructuredTool && tool.isStrict()) {
        ;(functionTool.function as any).strict = true
    }

    return functionTool
}

module.exports = { nodeClass: OpenAIAssistant_Agents }
