import { ChatMessage, LLMEndEvent, LLMStartEvent, LLMStreamEvent, MessageContentTextDetail, RetrievalEndEvent, Settings } from 'llamaindex'
import { EvaluationRunner } from './EvaluationRunner'
import { additionalCallbacks, ICommonObject, INodeData } from '../src'
import { RetrievalStartEvent } from 'llamaindex/dist/type/llm/types'
import { AgentEndEvent, AgentStartEvent } from 'llamaindex/dist/type/agent/types'
import { encoding_for_model } from '@dqbd/tiktoken'
import { MessageContent } from '@langchain/core/messages'

export class EvaluationRunTracerLlama {
    evaluationRunId: string
    static cbInit = false
    static startTimes = new Map<string, number>()
    static models = new Map<string, string>()
    static tokenCounts = new Map<string, number>()

    constructor(id: string) {
        this.evaluationRunId = id
        EvaluationRunTracerLlama.constructCallBacks()
    }

    static constructCallBacks = () => {
        if (!EvaluationRunTracerLlama.cbInit) {
            Settings.callbackManager.on('llm-start', (event: LLMStartEvent) => {
                const evalID = (event as any).reason.parent?.caller?.evaluationRunId || (event as any).reason.caller?.evaluationRunId
                if (!evalID) return
                const model = (event as any).reason?.caller?.model
                if (model) {
                    EvaluationRunTracerLlama.models.set(evalID, model)
                    try {
                        const encoding = encoding_for_model(model)
                        if (encoding) {
                            const { messages } = event.detail.payload
                            let tokenCount = messages.reduce((count: number, message: ChatMessage) => {
                                return count + encoding.encode(extractText(message.content)).length
                            }, 0)
                            EvaluationRunTracerLlama.tokenCounts.set(evalID + '_promptTokens', tokenCount)
                            EvaluationRunTracerLlama.tokenCounts.set(evalID + '_outputTokens', 0)
                        }
                    } catch (e) {
                        // catch the error and continue to work.
                    }
                }
                EvaluationRunTracerLlama.startTimes.set(evalID + '_llm', event.timeStamp)
            })
            Settings.callbackManager.on('llm-end', (event: LLMEndEvent) => {
                this.calculateAndSetMetrics(event, 'llm')
            })
            Settings.callbackManager.on('llm-stream', (event: LLMStreamEvent) => {
                const evalID = (event as any).reason.parent?.caller?.evaluationRunId || (event as any).reason.caller?.evaluationRunId
                if (!evalID) return
                const { chunk } = event.detail.payload
                const { delta } = chunk
                const model = (event as any).reason?.caller?.model
                try {
                    const encoding = encoding_for_model(model)
                    if (encoding) {
                        let tokenCount = EvaluationRunTracerLlama.tokenCounts.get(evalID + '_outputTokens') || 0
                        tokenCount += encoding.encode(extractText(delta)).length
                        EvaluationRunTracerLlama.tokenCounts.set(evalID + '_outputTokens', tokenCount)
                    }
                } catch (e) {
                    // catch the error and continue to work.
                }
            })
            Settings.callbackManager.on('retrieve-start', (event: RetrievalStartEvent) => {
                const evalID = (event as any).reason.parent?.caller?.evaluationRunId || (event as any).reason.caller?.evaluationRunId
                if (evalID) {
                    EvaluationRunTracerLlama.startTimes.set(evalID + '_retriever', event.timeStamp)
                }
            })
            Settings.callbackManager.on('retrieve-end', (event: RetrievalEndEvent) => {
                this.calculateAndSetMetrics(event, 'retriever')
            })
            Settings.callbackManager.on('agent-start', (event: AgentStartEvent) => {
                const evalID = (event as any).reason.parent?.caller?.evaluationRunId || (event as any).reason.caller?.evaluationRunId
                if (evalID) {
                    EvaluationRunTracerLlama.startTimes.set(evalID + '_agent', event.timeStamp)
                }
            })
            Settings.callbackManager.on('agent-end', (event: AgentEndEvent) => {
                this.calculateAndSetMetrics(event, 'agent')
            })
            EvaluationRunTracerLlama.cbInit = true
        }
    }

    private static calculateAndSetMetrics(event: any, label: string) {
        const evalID = event.reason.parent?.caller?.evaluationRunId || event.reason.caller?.evaluationRunId
        if (!evalID) return
        const startTime = EvaluationRunTracerLlama.startTimes.get(evalID + '_' + label) as number
        let model =
            (event as any).reason?.caller?.model || (event as any).reason?.caller?.llm?.model || EvaluationRunTracerLlama.models.get(evalID)

        if (event.detail.payload?.response?.message && model) {
            try {
                const encoding = encoding_for_model(model)
                if (encoding) {
                    let tokenCount = EvaluationRunTracerLlama.tokenCounts.get(evalID + '_outputTokens') || 0
                    tokenCount += encoding.encode(event.detail.payload.response?.message?.content || '').length
                    EvaluationRunTracerLlama.tokenCounts.set(evalID + '_outputTokens', tokenCount)
                }
            } catch (e) {
                // catch the error and continue to work.
            }
        }

        // Anthropic
        if (event.detail?.payload?.response?.raw?.usage) {
            const usage = event.detail.payload.response.raw.usage
            if (usage.output_tokens) {
                const metric = {
                    completionTokens: usage.output_tokens,
                    promptTokens: usage.input_tokens,
                    model: model,
                    totalTokens: usage.input_tokens + usage.output_tokens
                }
                EvaluationRunner.addMetrics(evalID, JSON.stringify(metric))
            } else if (usage.completion_tokens) {
                const metric = {
                    completionTokens: usage.completion_tokens,
                    promptTokens: usage.prompt_tokens,
                    model: model,
                    totalTokens: usage.total_tokens
                }
                EvaluationRunner.addMetrics(evalID, JSON.stringify(metric))
            }
        } else if (event.detail?.payload?.response?.raw['amazon-bedrock-invocationMetrics']) {
            const usage = event.detail?.payload?.response?.raw['amazon-bedrock-invocationMetrics']
            const metric = {
                completionTokens: usage.outputTokenCount,
                promptTokens: usage.inputTokenCount,
                model: event.detail?.payload?.response?.raw.model,
                totalTokens: usage.inputTokenCount + usage.outputTokenCount
            }
            EvaluationRunner.addMetrics(evalID, JSON.stringify(metric))
        } else {
            const metric = {
                [label]: (event.timeStamp - startTime).toFixed(2),
                completionTokens: EvaluationRunTracerLlama.tokenCounts.get(evalID + '_outputTokens'),
                promptTokens: EvaluationRunTracerLlama.tokenCounts.get(evalID + '_promptTokens'),
                model: model || EvaluationRunTracerLlama.models.get(evalID) || '',
                totalTokens:
                    (EvaluationRunTracerLlama.tokenCounts.get(evalID + '_outputTokens') || 0) +
                    (EvaluationRunTracerLlama.tokenCounts.get(evalID + '_promptTokens') || 0)
            }
            EvaluationRunner.addMetrics(evalID, JSON.stringify(metric))
        }

        //cleanup
        EvaluationRunTracerLlama.startTimes.delete(evalID + '_' + label)
        EvaluationRunTracerLlama.startTimes.delete(evalID + '_outputTokens')
        EvaluationRunTracerLlama.startTimes.delete(evalID + '_promptTokens')
        EvaluationRunTracerLlama.models.delete(evalID)
    }

    static async injectEvaluationMetadata(nodeData: INodeData, options: ICommonObject, callerObj: any) {
        if (options.evaluationRunId && callerObj) {
            // these are needed for evaluation runs
            options.llamaIndex = true
            await additionalCallbacks(nodeData, options)
            Object.defineProperty(callerObj, 'evaluationRunId', {
                enumerable: true,
                configurable: true,
                writable: true,
                value: options.evaluationRunId
            })
        }
    }
}

// from https://github.com/run-llama/LlamaIndexTS/blob/main/packages/core/src/llm/utils.ts
export function extractText(message: MessageContent): string {
    if (typeof message !== 'string' && !Array.isArray(message)) {
        console.warn('extractText called with non-MessageContent message, this is likely a bug.')
        return `${message}`
    } else if (typeof message !== 'string' && Array.isArray(message)) {
        // message is of type MessageContentDetail[] - retrieve just the text parts and concatenate them
        // so we can pass them to the context generator
        return message
            .filter((c): c is MessageContentTextDetail => c.type === 'text')
            .map((c) => c.text)
            .join('\n\n')
    } else {
        return message
    }
}
