import { Response } from 'express'
import { IServerSideEventStreamer } from 'flowise-components'
import logger from './logger'

// define a new type that has a client type (INTERNAL or EXTERNAL) and Response type
type Client = {
    // future use
    clientType: 'INTERNAL' | 'EXTERNAL'
    response: Response
    // optional property with default value
    started?: boolean
}

export class SSEStreamer implements IServerSideEventStreamer {
    clients: { [id: string]: Client } = {}

    addExternalClient(chatId: string, res: Response) {
        // TODO: Remove debug logging after fixing Redis pub-sub issues
        // Original: this.clients[chatId] = { clientType: 'EXTERNAL', response: res, started: false }
        logger.info(`[SSEStreamer] Adding external client - chatId: ${chatId}`)
        this.clients[chatId] = { clientType: 'EXTERNAL', response: res, started: false }
    }

    addClient(chatId: string, res: Response) {
        // TODO: Remove debug logging after fixing Redis pub-sub issues
        // Original: this.clients[chatId] = { clientType: 'INTERNAL', response: res, started: false }
        logger.info(`[SSEStreamer] Adding internal client - chatId: ${chatId}`)
        this.clients[chatId] = { clientType: 'INTERNAL', response: res, started: false }
    }

    removeClient(chatId: string) {
        const client = this.clients[chatId]
        if (client) {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: const clientResponse = { event: 'end', data: '[DONE]' }; client.response.write('message\ndata:' + JSON.stringify(clientResponse) + '\n\n'); client.response.end()
            logger.info(`[SSEStreamer] Removing client - chatId: ${chatId}`)
            try {
                const clientResponse = {
                    event: 'end',
                    data: '[DONE]'
                }
                client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
                client.response.end()
            } catch (error) {
                logger.error(`[SSEStreamer] Error removing client - chatId: ${chatId}`, { error })
            }
            delete this.clients[chatId]
        } else {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: (no warning)
            logger.warn(`[SSEStreamer] Attempted to remove non-existent client - chatId: ${chatId}`)
        }
    }

    streamCustomEvent(chatId: string, eventType: string, data: any) {
        const client = this.clients[chatId]
        if (client) {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: const clientResponse = { event: eventType, data: data }; client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
            logger.info(`[SSEStreamer] Streaming custom event to client - chatId: ${chatId}, eventType: ${eventType}`)
            try {
                const clientResponse = {
                    event: eventType,
                    data: data
                }
                client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
            } catch (error) {
                logger.error(`[SSEStreamer] Error streaming custom event - chatId: ${chatId}, eventType: ${eventType}`, { error })
            }
        } else {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: (no warning)
            logger.warn(`[SSEStreamer] No client found for custom event - chatId: ${chatId}, eventType: ${eventType}`)
        }
    }

    streamStartEvent(chatId: string, data: string) {
        const client = this.clients[chatId]
        // prevent multiple start events being streamed to the client
        if (client && !client.started) {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: const clientResponse = { event: 'start', data: data }; client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n'); client.started = true
            logger.info(`[SSEStreamer] Streaming start event to client - chatId: ${chatId}`)
            try {
                const clientResponse = {
                    event: 'start',
                    data: data
                }
                client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
                client.started = true
            } catch (error) {
                logger.error(`[SSEStreamer] Error streaming start event - chatId: ${chatId}`, { error })
            }
        } else if (client && client.started) {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: (no warning)
            logger.warn(`[SSEStreamer] Start event already sent for chatId: ${chatId}`)
        } else {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: (no warning)
            logger.warn(`[SSEStreamer] No client found for start event - chatId: ${chatId}`)
        }
    }

    streamTokenEvent(chatId: string, data: string) {
        const client = this.clients[chatId]
        if (client) {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: const clientResponse = { event: 'token', data: data }; client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
            logger.info(`[SSEStreamer] Streaming token event to client - chatId: ${chatId}`)
            try {
                const clientResponse = {
                    event: 'token',
                    data: data
                }
                client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
            } catch (error) {
                logger.error(`[SSEStreamer] Error streaming token event - chatId: ${chatId}`, { error })
            }
        } else {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: (no warning)
            logger.warn(`[SSEStreamer] No client found for token event - chatId: ${chatId}`)
        }
    }

    streamSourceDocumentsEvent(chatId: string, data: any) {
        const client = this.clients[chatId]
        if (client) {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: const clientResponse = { event: 'sourceDocuments', data: data }; client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
            logger.info(`[SSEStreamer] Streaming sourceDocuments event to client - chatId: ${chatId}`)
            try {
                const clientResponse = {
                    event: 'sourceDocuments',
                    data: data
                }
                client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
            } catch (error) {
                logger.error(`[SSEStreamer] Error streaming sourceDocuments event - chatId: ${chatId}`, { error })
            }
        } else {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: (no warning)
            logger.warn(`[SSEStreamer] No client found for sourceDocuments event - chatId: ${chatId}`)
        }
    }
    streamArtifactsEvent(chatId: string, data: any) {
        const client = this.clients[chatId]
        if (client) {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: const clientResponse = { event: 'artifacts', data: data }; client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
            logger.info(`[SSEStreamer] Streaming artifacts event to client - chatId: ${chatId}`)
            try {
                const clientResponse = {
                    event: 'artifacts',
                    data: data
                }
                client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
            } catch (error) {
                logger.error(`[SSEStreamer] Error streaming artifacts event - chatId: ${chatId}`, { error })
            }
        } else {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: (no warning)
            logger.warn(`[SSEStreamer] No client found for artifacts event - chatId: ${chatId}`)
        }
    }
    streamUsedToolsEvent(chatId: string, data: any): void {
        const client = this.clients[chatId]
        if (client) {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: const clientResponse = { event: 'usedTools', data: data }; client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
            logger.info(`[SSEStreamer] Streaming usedTools event to client - chatId: ${chatId}`)
            try {
                const clientResponse = {
                    event: 'usedTools',
                    data: data
                }
                client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
            } catch (error) {
                logger.error(`[SSEStreamer] Error streaming usedTools event - chatId: ${chatId}`, { error })
            }
        } else {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: (no warning)
            logger.warn(`[SSEStreamer] No client found for usedTools event - chatId: ${chatId}`)
        }
    }
    streamCalledToolsEvent(chatId: string, data: any): void {
        const client = this.clients[chatId]
        if (client) {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: const clientResponse = { event: 'calledTools', data: data }; client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
            logger.info(`[SSEStreamer] Streaming calledTools event to client - chatId: ${chatId}`)
            try {
                const clientResponse = {
                    event: 'calledTools',
                    data: data
                }
                client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
            } catch (error) {
                logger.error(`[SSEStreamer] Error streaming calledTools event - chatId: ${chatId}`, { error })
            }
        } else {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: (no warning)
            logger.warn(`[SSEStreamer] No client found for calledTools event - chatId: ${chatId}`)
        }
    }
    streamFileAnnotationsEvent(chatId: string, data: any): void {
        const client = this.clients[chatId]
        if (client) {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: const clientResponse = { event: 'fileAnnotations', data: data }; client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
            logger.info(`[SSEStreamer] Streaming fileAnnotations event to client - chatId: ${chatId}`)
            try {
                const clientResponse = {
                    event: 'fileAnnotations',
                    data: data
                }
                client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
            } catch (error) {
                logger.error(`[SSEStreamer] Error streaming fileAnnotations event - chatId: ${chatId}`, { error })
            }
        } else {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: (no warning)
            logger.warn(`[SSEStreamer] No client found for fileAnnotations event - chatId: ${chatId}`)
        }
    }
    streamToolEvent(chatId: string, data: any): void {
        const client = this.clients[chatId]
        if (client) {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: const clientResponse = { event: 'tool', data: data }; client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
            logger.info(`[SSEStreamer] Streaming tool event to client - chatId: ${chatId}`)
            try {
                const clientResponse = {
                    event: 'tool',
                    data: data
                }
                client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
            } catch (error) {
                logger.error(`[SSEStreamer] Error streaming tool event - chatId: ${chatId}`, { error })
            }
        } else {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: (no warning)
            logger.warn(`[SSEStreamer] No client found for tool event - chatId: ${chatId}`)
        }
    }
    streamAgentReasoningEvent(chatId: string, data: any): void {
        const client = this.clients[chatId]
        if (client) {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: const clientResponse = { event: 'agentReasoning', data: data }; client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
            logger.info(`[SSEStreamer] Streaming agentReasoning event to client - chatId: ${chatId}`)
            try {
                const clientResponse = {
                    event: 'agentReasoning',
                    data: data
                }
                client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
            } catch (error) {
                logger.error(`[SSEStreamer] Error streaming agentReasoning event - chatId: ${chatId}`, { error })
            }
        } else {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: (no warning)
            logger.warn(`[SSEStreamer] No client found for agentReasoning event - chatId: ${chatId}`)
        }
    }
    streamNextAgentEvent(chatId: string, data: any): void {
        const client = this.clients[chatId]
        if (client) {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: const clientResponse = { event: 'nextAgent', data: data }; client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
            logger.info(`[SSEStreamer] Streaming nextAgent event to client - chatId: ${chatId}`)
            try {
                const clientResponse = {
                    event: 'nextAgent',
                    data: data
                }
                client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
            } catch (error) {
                logger.error(`[SSEStreamer] Error streaming nextAgent event - chatId: ${chatId}`, { error })
            }
        } else {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: (no warning)
            logger.warn(`[SSEStreamer] No client found for nextAgent event - chatId: ${chatId}`)
        }
    }
    streamAgentFlowEvent(chatId: string, data: any): void {
        const client = this.clients[chatId]
        if (client) {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: const clientResponse = { event: 'agentFlowEvent', data: data }; client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
            logger.info(`[SSEStreamer] Streaming agentFlowEvent event to client - chatId: ${chatId}`)
            try {
                const clientResponse = {
                    event: 'agentFlowEvent',
                    data: data
                }
                client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
            } catch (error) {
                logger.error(`[SSEStreamer] Error streaming agentFlowEvent event - chatId: ${chatId}`, { error })
            }
        } else {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: (no warning)
            logger.warn(`[SSEStreamer] No client found for agentFlowEvent event - chatId: ${chatId}`)
        }
    }
    streamAgentFlowExecutedDataEvent(chatId: string, data: any): void {
        const client = this.clients[chatId]
        if (client) {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: const clientResponse = { event: 'agentFlowExecutedData', data: data }; client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
            logger.info(`[SSEStreamer] Streaming agentFlowExecutedData event to client - chatId: ${chatId}`)
            try {
                const clientResponse = {
                    event: 'agentFlowExecutedData',
                    data: data
                }
                client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
            } catch (error) {
                logger.error(`[SSEStreamer] Error streaming agentFlowExecutedData event - chatId: ${chatId}`, { error })
            }
        } else {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: (no warning)
            logger.warn(`[SSEStreamer] No client found for agentFlowExecutedData event - chatId: ${chatId}`)
        }
    }
    streamNextAgentFlowEvent(chatId: string, data: any): void {
        const client = this.clients[chatId]
        if (client) {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: const clientResponse = { event: 'nextAgentFlow', data: data }; client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
            logger.info(`[SSEStreamer] Streaming nextAgentFlow event to client - chatId: ${chatId}`)
            try {
                const clientResponse = {
                    event: 'nextAgentFlow',
                    data: data
                }
                client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
            } catch (error) {
                logger.error(`[SSEStreamer] Error streaming nextAgentFlow event - chatId: ${chatId}`, { error })
            }
        } else {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: (no warning)
            logger.warn(`[SSEStreamer] No client found for nextAgentFlow event - chatId: ${chatId}`)
        }
    }
    streamActionEvent(chatId: string, data: any): void {
        const client = this.clients[chatId]
        if (client) {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: const clientResponse = { event: 'action', data: data }; client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
            logger.info(`[SSEStreamer] Streaming action event to client - chatId: ${chatId}`)
            try {
                const clientResponse = {
                    event: 'action',
                    data: data
                }
                client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
            } catch (error) {
                logger.error(`[SSEStreamer] Error streaming action event - chatId: ${chatId}`, { error })
            }
        } else {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: (no warning)
            logger.warn(`[SSEStreamer] No client found for action event - chatId: ${chatId}`)
        }
    }

    streamAbortEvent(chatId: string): void {
        const client = this.clients[chatId]
        if (client) {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: const clientResponse = { event: 'abort', data: '[DONE]' }; client.response.write('message\ndata:' + JSON.stringify(clientResponse) + '\n\n')
            logger.info(`[SSEStreamer] Streaming abort event to client - chatId: ${chatId}`)
            try {
                const clientResponse = {
                    event: 'abort',
                    data: '[DONE]'
                }
                client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
            } catch (error) {
                logger.error(`[SSEStreamer] Error streaming abort event - chatId: ${chatId}`, { error })
            }
        } else {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: (no warning)
            logger.warn(`[SSEStreamer] No client found for abort event - chatId: ${chatId}`)
        }
    }

    streamEndEvent(_: string) {
        // placeholder for future use
    }

    streamErrorEvent(chatId: string, msg: string) {
        if (msg.includes('401 Incorrect API key provided')) msg = '401 Invalid model key or Incorrect local model configuration.'
        const client = this.clients[chatId]
        if (client) {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: const clientResponse = { event: 'error', data: msg }; client.response.write('message\ndata:' + JSON.stringify(clientResponse) + '\n\n')
            logger.info(`[SSEStreamer] Streaming error event to client - chatId: ${chatId}, error: ${msg}`)
            try {
                const clientResponse = {
                    event: 'error',
                    data: msg
                }
                client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
            } catch (error) {
                logger.error(`[SSEStreamer] Error streaming error event - chatId: ${chatId}`, { error })
            }
        } else {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: (no warning)
            logger.warn(`[SSEStreamer] No client found for error event - chatId: ${chatId}`)
        }
    }

    streamMetadataEvent(chatId: string, apiResponse: any) {
        // TODO: Remove debug logging after fixing Redis pub-sub issues
        // Original: const metadataJson: any = {}; ... (no initial logging)
        logger.info(`[SSEStreamer] Processing metadata event - chatId: ${chatId}`)
        const metadataJson: any = {}
        if (apiResponse.chatId) {
            metadataJson['chatId'] = apiResponse.chatId
        }
        if (apiResponse.chatMessageId) {
            metadataJson['chatMessageId'] = apiResponse.chatMessageId
        }
        if (apiResponse.question) {
            metadataJson['question'] = apiResponse.question
        }
        if (apiResponse.sessionId) {
            metadataJson['sessionId'] = apiResponse.sessionId
        }
        if (apiResponse.memoryType) {
            metadataJson['memoryType'] = apiResponse.memoryType
        }
        if (apiResponse.followUpPrompts) {
            metadataJson['followUpPrompts'] =
                typeof apiResponse.followUpPrompts === 'string' ? JSON.parse(apiResponse.followUpPrompts) : apiResponse.followUpPrompts
        }
        if (apiResponse.flowVariables) {
            metadataJson['flowVariables'] =
                typeof apiResponse.flowVariables === 'string' ? JSON.parse(apiResponse.flowVariables) : apiResponse.flowVariables
        }
        if (Object.keys(metadataJson).length > 0) {
            this.streamCustomEvent(chatId, 'metadata', metadataJson)
        } else {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: (no warning)
            logger.warn(`[SSEStreamer] No metadata to stream - chatId: ${chatId}`)
        }
    }

    streamUsageMetadataEvent(chatId: string, data: any): void {
        const client = this.clients[chatId]
        if (client) {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: const clientResponse = { event: 'usageMetadata', data: data }; client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
            logger.info(`[SSEStreamer] Streaming usageMetadata event to client - chatId: ${chatId}`)
            try {
                const clientResponse = {
                    event: 'usageMetadata',
                    data: data
                }
                client.response.write('message:\ndata:' + JSON.stringify(clientResponse) + '\n\n')
            } catch (error) {
                logger.error(`[SSEStreamer] Error streaming usageMetadata event - chatId: ${chatId}`, { error })
            }
        } else {
            // TODO: Remove debug logging after fixing Redis pub-sub issues
            // Original: (no warning)
            logger.warn(`[SSEStreamer] No client found for usageMetadata event - chatId: ${chatId}`)
        }
    }
}
