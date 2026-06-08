/**
 * Flowise wrapper around LangChain's ChatBedrockConverse.
 *
 * Extends the base class with three Flowise-specific behaviors:
 *
 * 1. **stopSequences stripping** — Some Bedrock models (DeepSeek, OpenAI GPT OSS)
 *    reject the `stopSequences` inference config field. The `invocationParams()`
 *    override removes it for models flagged with `stop_sequences: false` in models.json.
 *
 * 2. **Temperature auto-retry** — Some models (e.g., Claude Opus 4.7) reject the
 *    `temperature` parameter. `_generate()` and `_streamResponseChunks()` catch
 *    "temperature is deprecated" errors and retry without temperature. This avoids
 *    maintaining a per-model flag in models.json since Bedrock has no API to query
 *    supported inference parameters, and the UI form renderer can't conditionally
 *    disable fields based on the selected model.
 *
 * 3. **Error normalization** — `_generate()` and `_streamResponseChunks()` catch
 *    Bedrock errors and rewrite them into actionable user-facing messages via
 *    `normalizeBedrockError()` (e.g., "use an inference profile" instead of raw
 *    ValidationException).
 *
 * 4. **Multimodal support** — Implements `IVisionChatModal` for image upload handling.
 *
 * @see https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference.html
 */
import { IVisionChatModal, IMultiModalOption } from '../../../src'
import { ChatBedrockConverse as LCBedrockChat, ChatBedrockConverseInput } from '@langchain/aws'
import type { BaseMessage } from '@langchain/core/messages'
import type { ChatResult } from '@langchain/core/outputs'
import type { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager'
import { normalizeBedrockError } from './utils'

export class BedrockChat extends LCBedrockChat implements IVisionChatModal {
    configuredModel: string
    configuredMaxToken?: number
    multiModalOption: IMultiModalOption
    id: string
    stopSeqUnsupported: Set<string>

    constructor(id: string, fields: ChatBedrockConverseInput, stopSeqUnsupported?: Set<string>) {
        super(fields)
        this.id = id
        this.configuredModel = fields?.model || ''
        this.configuredMaxToken = fields?.maxTokens
        this.stopSeqUnsupported = stopSeqUnsupported ?? new Set()
    }

    /**
     * Strips stopSequences for models that don't support it.
     * Models are identified by exact ID from models.json (`stop_sequences: false`),
     * not by provider prefix, to avoid silently stripping from future models that
     * may add support.
     */
    override invocationParams(options?: this['ParsedCallOptions']) {
        const params = super.invocationParams(options)
        const modelId = this.model ?? this.configuredModel
        if (this.stopSeqUnsupported.has(modelId)) {
            if (params.inferenceConfig) {
                delete params.inferenceConfig.stopSequences
            }
        }
        return params
    }

    private isTemperatureDeprecatedError(err: unknown): boolean {
        return err instanceof Error && err.message.includes('temperature') && err.message.includes('deprecated')
    }

    private disableTemperature(): void {
        this.temperature = undefined as any
    }

    override async _generate(
        messages: BaseMessage[],
        options: this['ParsedCallOptions'],
        runManager?: CallbackManagerForLLMRun
    ): Promise<ChatResult> {
        try {
            return await super._generate(messages, options, runManager)
        } catch (err) {
            if (this.isTemperatureDeprecatedError(err)) {
                this.disableTemperature()
                return await super._generate(messages, options, runManager)
            }
            throw normalizeBedrockError(err)
        }
    }

    override async *_streamResponseChunks(
        messages: BaseMessage[],
        options: this['ParsedCallOptions'],
        runManager?: CallbackManagerForLLMRun
    ) {
        try {
            yield* super._streamResponseChunks(messages, options, runManager)
        } catch (err) {
            if (this.isTemperatureDeprecatedError(err)) {
                this.disableTemperature()
                yield* super._streamResponseChunks(messages, options, runManager)
                return
            }
            throw normalizeBedrockError(err)
        }
    }

    setMultiModalOption(multiModalOption: IMultiModalOption): void {
        this.multiModalOption = multiModalOption
    }
}
