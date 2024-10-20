import { IterableReadableStream } from '@langchain/core/utils/stream'
import type { StringWithAutocomplete } from '@langchain/core/utils/types'
import { BaseLanguageModelCallOptions } from '@langchain/core/language_models/base'

export interface OllamaInput {
    embeddingOnly?: boolean
    f16KV?: boolean
    frequencyPenalty?: number
    headers?: Record<string, string>
    keepAlive?: string
    logitsAll?: boolean
    lowVram?: boolean
    mainGpu?: number
    model?: string
    baseUrl?: string
    mirostat?: number
    mirostatEta?: number
    mirostatTau?: number
    numBatch?: number
    numCtx?: number
    numGpu?: number
    numGqa?: number
    numKeep?: number
    numPredict?: number
    numThread?: number
    penalizeNewline?: boolean
    presencePenalty?: number
    repeatLastN?: number
    repeatPenalty?: number
    ropeFrequencyBase?: number
    ropeFrequencyScale?: number
    temperature?: number
    stop?: string[]
    tfsZ?: number
    topK?: number
    topP?: number
    typicalP?: number
    useMLock?: boolean
    useMMap?: boolean
    vocabOnly?: boolean
    format?: StringWithAutocomplete<'json'>
}

export interface OllamaRequestParams {
    model: string
    format?: StringWithAutocomplete<'json'>
    images?: string[]
    options: {
        embedding_only?: boolean
        f16_kv?: boolean
        frequency_penalty?: number
        logits_all?: boolean
        low_vram?: boolean
        main_gpu?: number
        mirostat?: number
        mirostat_eta?: number
        mirostat_tau?: number
        num_batch?: number
        num_ctx?: number
        num_gpu?: number
        num_gqa?: number
        num_keep?: number
        num_thread?: number
        num_predict?: number
        penalize_newline?: boolean
        presence_penalty?: number
        repeat_last_n?: number
        repeat_penalty?: number
        rope_frequency_base?: number
        rope_frequency_scale?: number
        temperature?: number
        stop?: string[]
        tfs_z?: number
        top_k?: number
        top_p?: number
        typical_p?: number
        use_mlock?: boolean
        use_mmap?: boolean
        vocab_only?: boolean
    }
}

export type OllamaMessage = {
    role: StringWithAutocomplete<'user' | 'assistant' | 'system'>
    content: string
    images?: string[]
}

export interface OllamaGenerateRequestParams extends OllamaRequestParams {
    prompt: string
}

export interface OllamaChatRequestParams extends OllamaRequestParams {
    messages: OllamaMessage[]
}

export type BaseOllamaGenerationChunk = {
    model: string
    created_at: string
    done: boolean
    total_duration?: number
    load_duration?: number
    prompt_eval_count?: number
    prompt_eval_duration?: number
    eval_count?: number
    eval_duration?: number
}

export type OllamaGenerationChunk = BaseOllamaGenerationChunk & {
    response: string
}

export type OllamaChatGenerationChunk = BaseOllamaGenerationChunk & {
    message: OllamaMessage
}

export type OllamaCallOptions = BaseLanguageModelCallOptions & {
    headers?: Record<string, string>
}

async function* createOllamaStream(url: string, params: OllamaRequestParams, options: OllamaCallOptions) {
    let formattedUrl = url
    if (formattedUrl.startsWith('http://localhost:')) {
        // Node 18 has issues with resolving "localhost"
        // See https://github.com/node-fetch/node-fetch/issues/1624
        formattedUrl = formattedUrl.replace('http://localhost:', 'http://127.0.0.1:')
    }
    const response = await fetch(formattedUrl, {
        method: 'POST',
        body: JSON.stringify(params),
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        signal: options.signal
    })
    if (!response.ok) {
        let error
        const responseText = await response.text()
        try {
            const json = JSON.parse(responseText)
            error = new Error(`Ollama call failed with status code ${response.status}: ${json.error}`)
        } catch (e) {
            error = new Error(`Ollama call failed with status code ${response.status}: ${responseText}`)
        }
        ;(error as any).response = response
        throw error
    }
    if (!response.body) {
        throw new Error('Could not begin Ollama stream. Please check the given URL and try again.')
    }

    const stream = IterableReadableStream.fromReadableStream(response.body)

    const decoder = new TextDecoder()
    let extra = ''
    for await (const chunk of stream) {
        const decoded = extra + decoder.decode(chunk)
        const lines = decoded.split('\n')
        extra = lines.pop() || ''
        for (const line of lines) {
            try {
                yield JSON.parse(line)
            } catch (e) {
                console.warn(`Received a non-JSON parseable chunk: ${line}`)
            }
        }
    }
}

export async function* createOllamaGenerateStream(
    baseUrl: string,
    params: OllamaGenerateRequestParams,
    options: OllamaCallOptions
): AsyncGenerator<OllamaGenerationChunk> {
    yield* createOllamaStream(`${baseUrl}/api/generate`, params, options)
}

export async function* createOllamaChatStream(
    baseUrl: string,
    params: OllamaChatRequestParams,
    options: OllamaCallOptions
): AsyncGenerator<OllamaChatGenerationChunk> {
    yield* createOllamaStream(`${baseUrl}/api/chat`, params, options)
}
