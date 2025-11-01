import { v4 as uuidv4 } from 'uuid'
import exportImportService from '../../src/services/export-import'
import { getRunningExpressApp } from '../../src/utils/getRunningExpressApp'
import { ChatFlow, EnumChatflowType } from '../../src/database/entities/ChatFlow'
import { ChatMessage } from '../../src/database/entities/ChatMessage'
import { ChatMessageFeedback } from '../../src/database/entities/ChatMessageFeedback'
import { Execution } from '../../src/database/entities/Execution'
import { DocumentStore } from '../../src/database/entities/DocumentStore'
import { DocumentStoreFileChunk } from '../../src/database/entities/DocumentStoreFileChunk'
// Casting string literals in the test body avoids pulling full workspace dependencies

export const exportImportServiceTest = () => {
    describe('exportImportService.importData', () => {
        it('updates existing child records when parent conflict is updated', async () => {
            const app = getRunningExpressApp()
            const manager = app.AppDataSource.manager

            const workspaceId = uuidv4()
            const orgId = uuidv4()

            const existingChatflowId = uuidv4()
            const importedChatflowId = existingChatflowId
            const existingDocumentStoreId = uuidv4()
            const importedDocumentStoreId = existingDocumentStoreId

            const existingMessageId = uuidv4()
            const existingFeedbackId = uuidv4()
            const existingExecutionId = uuidv4()
            const existingChunkId = uuidv4()
            const existingDocId = uuidv4()

            try {
                await manager.save(ChatFlow, {
                    id: existingChatflowId,
                    name: 'Existing Chatflow',
                    flowData: JSON.stringify({ nodes: [] }),
                    type: EnumChatflowType.CHATFLOW,
                    workspaceId
                })

                await manager.save(DocumentStore, {
                    id: existingDocumentStoreId,
                    name: 'Existing Store',
                    description: 'existing',
                    loaders: '[]',
                    whereUsed: '[]',
                    status: 'NEW' as any,
                    vectorStoreConfig: null,
                    embeddingConfig: null,
                    recordManagerConfig: null,
                    workspaceId
                })

                await manager.save(ChatMessage, {
                    id: existingMessageId,
                    role: 'userMessage',
                    chatflowid: existingChatflowId,
                    content: 'hello',
                    chatType: 'default',
                    chatId: 'chat-id',
                    sessionId: 'session-id'
                })

                await manager.save(ChatMessageFeedback, {
                    id: existingFeedbackId,
                    chatflowid: existingChatflowId,
                    chatId: 'chat-id',
                    messageId: existingMessageId,
                    rating: 'THUMBS_UP' as any,
                    content: 'original feedback'
                })

                await manager.save(Execution, {
                    id: existingExecutionId,
                    executionData: JSON.stringify({ original: true }),
                    state: 'FINISHED' as any,
                    agentflowId: existingChatflowId,
                    sessionId: 'session-id',
                    stoppedDate: new Date(),
                    workspaceId
                })

                await manager.save(DocumentStoreFileChunk, {
                    id: existingChunkId,
                    docId: existingDocId,
                    storeId: existingDocumentStoreId,
                    chunkNo: 0,
                    pageContent: 'content',
                    metadata: '{}'
                })

                const payload: any = {
                    AgentFlow: [],
                    AgentFlowV2: [],
                    AssistantFlow: [],
                    AssistantCustom: [],
                    AssistantOpenAI: [],
                    AssistantAzure: [],
                    ChatFlow: [
                        {
                            id: importedChatflowId,
                            name: 'Imported Chatflow',
                            flowData: JSON.stringify({ nodes: [] }),
                            type: EnumChatflowType.CHATFLOW,
                            workspaceId
                        }
                    ],
                    ChatMessage: [
                        {
                            id: existingMessageId,
                            role: 'userMessage',
                            chatflowid: importedChatflowId,
                            content: 'updated message',
                            chatType: 'default',
                            chatId: 'chat-id',
                            sessionId: 'session-id'
                        }
                    ],
                    ChatMessageFeedback: [
                        {
                            id: existingFeedbackId,
                            chatflowid: importedChatflowId,
                            chatId: 'chat-id',
                            messageId: existingMessageId,
                            rating: 'THUMBS_DOWN' as any,
                            content: 'updated feedback'
                        }
                    ],
                    CustomTemplate: [],
                    DocumentStore: [
                        {
                            id: importedDocumentStoreId,
                            name: 'Imported Store',
                            description: 'existing',
                            loaders: '[]',
                            whereUsed: '[]',
                            status: 'NEW' as any,
                            vectorStoreConfig: null,
                            embeddingConfig: null,
                            recordManagerConfig: null,
                            workspaceId
                        }
                    ],
                    DocumentStoreFileChunk: [
                        {
                            id: existingChunkId,
                            docId: existingDocId,
                            storeId: importedDocumentStoreId,
                            chunkNo: 0,
                            pageContent: 'updated content',
                            metadata: '{"updated":true}'
                        }
                    ],
                    Execution: [
                        {
                            id: existingExecutionId,
                            executionData: JSON.stringify({ updated: true }),
                            state: 'INPROGRESS' as any,
                            agentflowId: importedChatflowId,
                            sessionId: 'session-id-updated',
                            stoppedDate: new Date(),
                            workspaceId
                        }
                    ],
                    Tool: [],
                    Variable: [],
                    conflictResolutions: [
                        {
                            type: 'ChatFlow',
                            importId: importedChatflowId,
                            existingId: existingChatflowId,
                            action: 'update'
                        },
                        {
                            type: 'DocumentStore',
                            importId: importedDocumentStoreId,
                            existingId: existingDocumentStoreId,
                            action: 'update'
                        }
                    ]
                }

                await exportImportService.importData(payload, orgId, workspaceId, '')

                const message = await manager.findOne(ChatMessage, { where: { id: existingMessageId } })
                const feedback = await manager.findOne(ChatMessageFeedback, { where: { id: existingFeedbackId } })
                const execution = await manager.findOne(Execution, { where: { id: existingExecutionId } })
                const chunk = await manager.findOne(DocumentStoreFileChunk, { where: { id: existingChunkId } })

                expect(message?.chatflowid).toBe(existingChatflowId)
                expect(message?.content).toBe('updated message')
                expect(feedback?.chatflowid).toBe(existingChatflowId)
                expect(feedback?.rating).toBe('THUMBS_DOWN')
                expect(feedback?.content).toBe('updated feedback')
                expect(execution?.agentflowId).toBe(existingChatflowId)
                expect(execution?.executionData).toBe(JSON.stringify({ updated: true }))
                expect(execution?.state).toBe('INPROGRESS')
                expect(execution?.sessionId).toBe('session-id-updated')
                expect(chunk?.storeId).toBe(existingDocumentStoreId)
                expect(chunk?.pageContent).toBe('updated content')
                expect(chunk?.metadata).toBe('{"updated":true}')
            } finally {
                await manager.delete(DocumentStoreFileChunk, { id: existingChunkId })
                await manager.delete(DocumentStore, { id: existingDocumentStoreId })
                await manager.delete(ChatMessageFeedback, { id: existingFeedbackId })
                await manager.delete(ChatMessage, { id: existingMessageId })
                await manager.delete(Execution, { id: existingExecutionId })
                await manager.delete(ChatFlow, { id: existingChatflowId })
            }
        })

        it('creates duplicate child records when parent conflict is duplicated', async () => {
            const app = getRunningExpressApp()
            const manager = app.AppDataSource.manager

            const workspaceId = uuidv4()
            const orgId = uuidv4()

            const existingChatflowId = uuidv4()
            const existingDocumentStoreId = uuidv4()

            const existingMessageId = uuidv4()
            const existingFeedbackId = uuidv4()
            const existingExecutionId = uuidv4()
            const existingChunkId = uuidv4()

            try {
                await manager.save(ChatFlow, {
                    id: existingChatflowId,
                    name: 'Existing Chatflow',
                    flowData: JSON.stringify({ nodes: [] }),
                    type: EnumChatflowType.CHATFLOW,
                    workspaceId
                })

                await manager.save(DocumentStore, {
                    id: existingDocumentStoreId,
                    name: 'Existing Store',
                    description: 'existing',
                    loaders: '[]',
                    whereUsed: '[]',
                    status: 'NEW' as any,
                    vectorStoreConfig: null,
                    embeddingConfig: null,
                    recordManagerConfig: null,
                    workspaceId
                })

                await manager.save(ChatMessage, {
                    id: existingMessageId,
                    role: 'userMessage',
                    chatflowid: existingChatflowId,
                    content: 'hello',
                    chatType: 'default',
                    chatId: 'chat-id',
                    sessionId: 'session-id'
                })

                await manager.save(ChatMessageFeedback, {
                    id: existingFeedbackId,
                    chatflowid: existingChatflowId,
                    chatId: 'chat-id',
                    messageId: existingMessageId,
                    rating: 'THUMBS_UP' as any,
                    content: 'original feedback'
                })

                await manager.save(Execution, {
                    id: existingExecutionId,
                    executionData: JSON.stringify({}),
                    state: 'FINISHED' as any,
                    agentflowId: existingChatflowId,
                    sessionId: 'session-id',
                    stoppedDate: new Date(),
                    workspaceId
                })

                await manager.save(DocumentStoreFileChunk, {
                    id: existingChunkId,
                    docId: uuidv4(),
                    storeId: existingDocumentStoreId,
                    chunkNo: 0,
                    pageContent: 'content',
                    metadata: '{}'
                })

                const payload: any = {
                    AgentFlow: [],
                    AgentFlowV2: [],
                    AssistantFlow: [],
                    AssistantCustom: [],
                    AssistantOpenAI: [],
                    AssistantAzure: [],
                    ChatFlow: [
                        {
                            id: existingChatflowId,
                            name: 'Imported Chatflow',
                            flowData: JSON.stringify({ nodes: [] }),
                            type: EnumChatflowType.CHATFLOW,
                            workspaceId
                        }
                    ],
                    ChatMessage: [
                        {
                            id: existingMessageId,
                            role: 'userMessage',
                            chatflowid: existingChatflowId,
                            content: 'hello',
                            chatType: 'default',
                            chatId: 'chat-id-duplicate',
                            sessionId: 'session-id-duplicate'
                        }
                    ],
                    ChatMessageFeedback: [
                        {
                            id: existingFeedbackId,
                            chatflowid: existingChatflowId,
                            chatId: 'chat-id-duplicate',
                            messageId: existingMessageId,
                            rating: 'THUMBS_UP' as any,
                            content: 'duplicate feedback'
                        }
                    ],
                    CustomTemplate: [],
                    DocumentStore: [
                        {
                            id: existingDocumentStoreId,
                            name: 'Imported Store',
                            description: 'duplicate',
                            loaders: '[]',
                            whereUsed: '[]',
                            status: 'NEW' as any,
                            vectorStoreConfig: null,
                            embeddingConfig: null,
                            recordManagerConfig: null,
                            workspaceId
                        }
                    ],
                    DocumentStoreFileChunk: [
                        {
                            id: existingChunkId,
                            docId: uuidv4(),
                            storeId: existingDocumentStoreId,
                            chunkNo: 1,
                            pageContent: 'duplicate content',
                            metadata: '{}'
                        }
                    ],
                    Execution: [
                        {
                            id: existingExecutionId,
                            executionData: JSON.stringify({ duplicate: true }),
                            state: 'FINISHED' as any,
                            agentflowId: existingChatflowId,
                            sessionId: 'session-id-duplicate',
                            stoppedDate: new Date(),
                            workspaceId
                        }
                    ],
                    Tool: [],
                    Variable: [],
                    conflictResolutions: [
                        {
                            type: 'ChatFlow',
                            importId: existingChatflowId,
                            existingId: existingChatflowId,
                            action: 'duplicate'
                        },
                        {
                            type: 'DocumentStore',
                            importId: existingDocumentStoreId,
                            existingId: existingDocumentStoreId,
                            action: 'duplicate'
                        }
                    ]
                }

                await exportImportService.importData(payload, orgId, workspaceId, '')

                const newChatflow = await manager.findOne(ChatFlow, {
                    where: { name: 'Imported Chatflow', workspaceId }
                })
                expect(newChatflow).toBeTruthy()
                expect(newChatflow?.id).not.toBe(existingChatflowId)

                const duplicatedMessages = await manager.find(ChatMessage, {
                    where: { chatId: 'chat-id-duplicate' }
                })
                expect(duplicatedMessages).toHaveLength(1)
                expect(duplicatedMessages[0].chatflowid).toBe(newChatflow?.id)

                const duplicatedFeedback = await manager.find(ChatMessageFeedback, {
                    where: { chatId: 'chat-id-duplicate' }
                })
                expect(duplicatedFeedback).toHaveLength(1)
                expect(duplicatedFeedback[0].chatflowid).toBe(newChatflow?.id)

                const duplicatedExecution = await manager.find(Execution, {
                    where: { sessionId: 'session-id-duplicate' }
                })
                expect(duplicatedExecution).toHaveLength(1)
                expect(duplicatedExecution[0].agentflowId).toBe(newChatflow?.id)

                const duplicatedChunks = await manager.find(DocumentStoreFileChunk, {
                    where: { chunkNo: 1 }
                })
                expect(duplicatedChunks).toHaveLength(1)
                expect(duplicatedChunks[0].storeId).not.toBe(existingDocumentStoreId)

                const newDocumentStore = await manager.findOne(DocumentStore, {
                    where: { name: 'Imported Store', workspaceId }
                })
                expect(newDocumentStore).toBeTruthy()
                expect(newDocumentStore?.id).not.toBe(existingDocumentStoreId)
                expect(duplicatedChunks[0].storeId).toBe(newDocumentStore?.id)
            } finally {
                await manager.delete(DocumentStoreFileChunk, { chunkNo: 1 })
                await manager.delete(DocumentStoreFileChunk, { id: existingChunkId })
                await manager.delete(DocumentStore, { name: 'Imported Store' })
                await manager.delete(DocumentStore, { id: existingDocumentStoreId })
                await manager.delete(ChatMessageFeedback, { chatId: 'chat-id-duplicate' })
                await manager.delete(ChatMessageFeedback, { id: existingFeedbackId })
                await manager.delete(ChatMessage, { chatId: 'chat-id-duplicate' })
                await manager.delete(ChatMessage, { id: existingMessageId })
                await manager.delete(Execution, { sessionId: 'session-id-duplicate' })
                await manager.delete(Execution, { id: existingExecutionId })
                await manager.delete(ChatFlow, { name: 'Imported Chatflow' })
                await manager.delete(ChatFlow, { id: existingChatflowId })
            }
        })
    })
}
