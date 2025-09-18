import { RunCollectorCallbackHandler } from '@langchain/core/tracers/run_collector'
import { Run } from '@langchain/core/tracers/base'
import { EvaluationRunner } from './EvaluationRunner'
import { encoding_for_model, get_encoding } from '@dqbd/tiktoken'

export class EvaluationRunTracer extends RunCollectorCallbackHandler {
    evaluationRunId: string
    model: string

    constructor(id: string) {
        super()
        this.evaluationRunId = id
    }

    async persistRun(run: Run): Promise<void> {
        return super.persistRun(run)
    }

    countPromptTokens = (encoding: any, run: Run): number => {
        let promptTokenCount = 0
        if (encoding) {
            if (run.inputs?.messages?.length > 0 && run.inputs?.messages[0]?.length > 0) {
                run.inputs.messages[0].map((message: any) => {
                    let content = message.content
                        ? message.content
                        : message.SystemMessage?.content
                        ? message.SystemMessage.content
                        : message.HumanMessage?.content
                        ? message.HumanMessage.content
                        : message.AIMessage?.content
                        ? message.AIMessage.content
                        : undefined
                    promptTokenCount += content ? encoding.encode(content).length : 0
                })
            }
            if (run.inputs?.prompts?.length > 0) {
                const content = run.inputs.prompts[0]
                promptTokenCount += content ? encoding.encode(content).length : 0
            }
        }
        return promptTokenCount
    }

    countCompletionTokens = (encoding: any, run: Run): number => {
        let completionTokenCount = 0
        if (encoding) {
            if (run.outputs?.generations?.length > 0 && run.outputs?.generations[0]?.length > 0) {
                run.outputs?.generations[0].map((chunk: any) => {
                    let content = chunk.text ? chunk.text : chunk.message?.content ? chunk.message?.content : undefined
                    completionTokenCount += content ? encoding.encode(content).length : 0
                })
            }
        }
        return completionTokenCount
    }

    extractModelName = (run: Run): string => {
        return (
            (run?.serialized as any)?.kwargs?.model ||
            (run?.serialized as any)?.kwargs?.model_name ||
            (run?.extra as any)?.metadata?.ls_model_name ||
            (run?.extra as any)?.metadata?.fw_model_name
        )
    }

    onLLMEnd?(run: Run): void | Promise<void> {
        if (run.name) {
            let provider = run.name
            if (provider === 'BedrockChat') {
                provider = 'awsChatBedrock'
            }
            EvaluationRunner.addMetrics(
                this.evaluationRunId,
                JSON.stringify({
                    provider: provider
                })
            )
        }

        let model = this.extractModelName(run)
        if (run.outputs?.llmOutput?.tokenUsage) {
            const tokenUsage = run.outputs?.llmOutput?.tokenUsage
            if (tokenUsage) {
                const metric = {
                    completionTokens: tokenUsage.completionTokens,
                    promptTokens: tokenUsage.promptTokens,
                    model: model,
                    totalTokens: tokenUsage.totalTokens
                }
                EvaluationRunner.addMetrics(this.evaluationRunId, JSON.stringify(metric))
            }
        } else if (
            run.outputs?.generations?.length > 0 &&
            run.outputs?.generations[0].length > 0 &&
            run.outputs?.generations[0][0]?.message?.usage_metadata?.total_tokens
        ) {
            const usage_metadata = run.outputs?.generations[0][0]?.message?.usage_metadata
            if (usage_metadata) {
                const metric = {
                    completionTokens: usage_metadata.output_tokens,
                    promptTokens: usage_metadata.input_tokens,
                    model: model || this.model,
                    totalTokens: usage_metadata.total_tokens
                }
                EvaluationRunner.addMetrics(this.evaluationRunId, JSON.stringify(metric))
            }
        } else {
            let encoding: any = undefined
            let promptInputTokens = 0
            let completionTokenCount = 0
            try {
                encoding = encoding_for_model(model as any)
                promptInputTokens = this.countPromptTokens(encoding, run)
                completionTokenCount = this.countCompletionTokens(encoding, run)
            } catch (e) {
                try {
                    // as tiktoken will fail for non openai models, assume that is 'cl100k_base'
                    encoding = get_encoding('cl100k_base')
                    promptInputTokens = this.countPromptTokens(encoding, run)
                    completionTokenCount = this.countCompletionTokens(encoding, run)
                } catch (e) {
                    // stay silent
                }
            }
            const metric = {
                completionTokens: completionTokenCount,
                promptTokens: promptInputTokens,
                model: model,
                totalTokens: promptInputTokens + completionTokenCount
            }
            EvaluationRunner.addMetrics(this.evaluationRunId, JSON.stringify(metric))
            //cleanup
            this.model = ''
        }
    }

    async onRunUpdate(run: Run): Promise<void> {
        const json = {
            [run.run_type]: elapsed(run)
        }
        let metric = JSON.stringify(json)
        if (metric) {
            EvaluationRunner.addMetrics(this.evaluationRunId, metric)
        }

        if (run.run_type === 'llm') {
            let model = this.extractModelName(run)
            if (model) {
                EvaluationRunner.addMetrics(this.evaluationRunId, JSON.stringify({ model: model }))
                this.model = model
            }
            // OpenAI non streaming models
            const estimatedTokenUsage = run.outputs?.llmOutput?.estimatedTokenUsage
            if (estimatedTokenUsage && typeof estimatedTokenUsage === 'object' && Object.keys(estimatedTokenUsage).length > 0) {
                EvaluationRunner.addMetrics(this.evaluationRunId, estimatedTokenUsage)
            }
        }
    }
}

function elapsed(run: Run) {
    if (!run.end_time) return ''
    const elapsed = run.end_time - run.start_time
    return `${elapsed.toFixed(2)}`
}
