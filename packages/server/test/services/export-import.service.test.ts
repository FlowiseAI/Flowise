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
        it('skips recreating existing child records when parent conflict is updated', async () => {
            const app = getRunningExpressApp()
            const manager = app.AppDataSource.manager

            const workspaceId = uuidv4()
            const orgId = uuidv4()

            const existingChatflowId = uuidv4()
            const importedChatflowId = uuidv4()
            const existingDocumentStoreId = uuidv4()
            const importedDocumentStoreId = uuidv4()

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
                    rating: 'THUMBS_UP' as any
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
                            content: 'hello',
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
                            rating: 'THUMBS_UP' as any
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
                            pageContent: 'content',
                            metadata: '{}'
                        }
                    ],
                    Execution: [
                        {
                            id: existingExecutionId,
                            executionData: JSON.stringify({}),
                            state: 'FINISHED' as any,
                            agentflowId: importedChatflowId,
                            sessionId: 'session-id',
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

                const messageCount = await manager.count(ChatMessage, { where: { id: existingMessageId } })
                const feedbackCount = await manager.count(ChatMessageFeedback, { where: { id: existingFeedbackId } })
                const executionCount = await manager.count(Execution, { where: { id: existingExecutionId } })
                const chunkCount = await manager.count(DocumentStoreFileChunk, { where: { id: existingChunkId } })

                expect(messageCount).toBe(1)
                expect(feedbackCount).toBe(1)
                expect(executionCount).toBe(1)
                expect(chunkCount).toBe(1)
            } finally {
                await manager.delete(DocumentStoreFileChunk, { id: existingChunkId })
                await manager.delete(DocumentStore, { id: existingDocumentStoreId })
                await manager.delete(ChatMessageFeedback, { id: existingFeedbackId })
                await manager.delete(ChatMessage, { id: existingMessageId })
                await manager.delete(Execution, { id: existingExecutionId })
                await manager.delete(ChatFlow, { id: existingChatflowId })
            }
        })
    })
}
