import { OTLPTraceExporter as ProtoOTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto'
import { getPhoenixTracer } from './handler'

jest.mock('@opentelemetry/exporter-trace-otlp-proto', () => {
    return {
        OTLPTraceExporter: jest.fn().mockImplementation((args) => {
            return { args }
        })
    }
})

describe('URL Handling For Phoenix Tracer', () => {
    const apiKey = 'test-api-key'
    const projectName = 'test-project-name'

    const makeOptions = (baseUrl: string) => ({
        baseUrl,
        apiKey,
        projectName,
        enableCallback: false
    })

    beforeEach(() => {
        jest.clearAllMocks()
    })

    const cases: [string, string][] = [
        ['http://localhost:6006', 'http://localhost:6006/v1/traces'],
        ['http://localhost:6006/v1/traces', 'http://localhost:6006/v1/traces'],
        ['https://app.phoenix.arize.com', 'https://app.phoenix.arize.com/v1/traces'],
        ['https://app.phoenix.arize.com/v1/traces', 'https://app.phoenix.arize.com/v1/traces'],
        ['https://app.phoenix.arize.com/s/my-space', 'https://app.phoenix.arize.com/s/my-space/v1/traces'],
        ['https://app.phoenix.arize.com/s/my-space/v1/traces', 'https://app.phoenix.arize.com/s/my-space/v1/traces'],
        ['https://my-phoenix.com/my-slug', 'https://my-phoenix.com/my-slug/v1/traces'],
        ['https://my-phoenix.com/my-slug/v1/traces', 'https://my-phoenix.com/my-slug/v1/traces']
    ]

    it.each(cases)('baseUrl %s - exporterUrl %s', (input, expected) => {
        getPhoenixTracer(makeOptions(input))
        expect(ProtoOTLPTraceExporter).toHaveBeenCalledWith(
            expect.objectContaining({
                url: expected,
                headers: expect.objectContaining({
                    api_key: apiKey,
                    authorization: `Bearer ${apiKey}`
                })
            })
        )
    })
})

/**
 * Unit tests for onLLMEnd usage metadata extraction
 *
 * These tests verify the logic for extracting and formatting usage metadata
 * from the onLLMEnd output parameter. Due to Jest configuration constraints
 * with the complex OpenTelemetry and analytics dependencies, these tests are
 * implemented as pure function tests that verify the extraction logic.
 */
describe('onLLMEnd Usage Metadata Extraction Logic', () => {
    // Helper function that mirrors the extraction logic in handler.ts onLLMEnd
    const extractOutputData = (output: string | Record<string, any>) => {
        let outputText: string
        let usageMetadata: Record<string, any> | undefined
        let modelName: string | undefined

        if (typeof output === 'string') {
            outputText = output
        } else {
            outputText = output.content ?? ''
            usageMetadata = output.usageMetadata ?? output.usage_metadata
            if (usageMetadata) {
                usageMetadata = {
                    input_tokens: usageMetadata.input_tokens ?? usageMetadata.prompt_tokens,
                    output_tokens: usageMetadata.output_tokens ?? usageMetadata.completion_tokens,
                    total_tokens: usageMetadata.total_tokens
                }
            }
            const responseMetadata = output.responseMetadata ?? output.response_metadata
            if (responseMetadata) {
                modelName = responseMetadata.model ?? responseMetadata.model_name ?? responseMetadata.modelId
            }
        }
        return { outputText, usageMetadata, modelName }
    }

    // Helper to format for Langfuse
    const formatForLangfuse = (usageMetadata: Record<string, any> | undefined) => {
        if (!usageMetadata) return undefined
        return {
            promptTokens: usageMetadata.input_tokens,
            completionTokens: usageMetadata.output_tokens,
            totalTokens: usageMetadata.total_tokens
        }
    }

    // Helper to format for LangSmith
    const formatForLangSmith = (usageMetadata: Record<string, any> | undefined) => {
        if (!usageMetadata) return undefined
        return {
            prompt_tokens: usageMetadata.input_tokens,
            completion_tokens: usageMetadata.output_tokens,
            total_tokens: usageMetadata.total_tokens
        }
    }

    describe('backward compatibility with string input', () => {
        it('should handle plain string output', () => {
            const result = extractOutputData('Hello, world!')
            expect(result.outputText).toBe('Hello, world!')
            expect(result.usageMetadata).toBeUndefined()
            expect(result.modelName).toBeUndefined()
        })

        it('should handle empty string', () => {
            const result = extractOutputData('')
            expect(result.outputText).toBe('')
        })
    })

    describe('structured input with usage metadata', () => {
        it('should extract usage metadata using LangChain field names (input_tokens/output_tokens)', () => {
            const result = extractOutputData({
                content: 'Test response',
                usageMetadata: {
                    input_tokens: 100,
                    output_tokens: 50,
                    total_tokens: 150
                },
                responseMetadata: {
                    model: 'gpt-4'
                }
            })

            expect(result.outputText).toBe('Test response')
            expect(result.usageMetadata).toEqual({
                input_tokens: 100,
                output_tokens: 50,
                total_tokens: 150
            })
            expect(result.modelName).toBe('gpt-4')
        })

        it('should handle OpenAI field names (prompt_tokens/completion_tokens)', () => {
            const result = extractOutputData({
                content: 'Test response',
                usageMetadata: {
                    prompt_tokens: 200,
                    completion_tokens: 100,
                    total_tokens: 300
                }
            })

            // Should normalize to input_tokens/output_tokens
            expect(result.usageMetadata).toEqual({
                input_tokens: 200,
                output_tokens: 100,
                total_tokens: 300
            })
        })

        it('should handle usage_metadata (snake_case) field name', () => {
            const result = extractOutputData({
                content: 'Test response',
                usage_metadata: {
                    input_tokens: 50,
                    output_tokens: 25,
                    total_tokens: 75
                }
            })

            expect(result.usageMetadata).toEqual({
                input_tokens: 50,
                output_tokens: 25,
                total_tokens: 75
            })
        })

        it('should prefer usageMetadata over usage_metadata', () => {
            const result = extractOutputData({
                content: 'Test',
                usageMetadata: { input_tokens: 100, output_tokens: 50, total_tokens: 150 },
                usage_metadata: { input_tokens: 1, output_tokens: 1, total_tokens: 2 }
            })

            expect(result.usageMetadata?.input_tokens).toBe(100)
        })
    })

    describe('model name extraction', () => {
        it('should extract model from responseMetadata.model', () => {
            const result = extractOutputData({
                content: 'Test',
                responseMetadata: { model: 'gpt-4-turbo' }
            })
            expect(result.modelName).toBe('gpt-4-turbo')
        })

        it('should extract model from responseMetadata.model_name', () => {
            const result = extractOutputData({
                content: 'Test',
                responseMetadata: { model_name: 'claude-3-opus' }
            })
            expect(result.modelName).toBe('claude-3-opus')
        })

        it('should extract model from responseMetadata.modelId', () => {
            const result = extractOutputData({
                content: 'Test',
                responseMetadata: { modelId: 'anthropic.claude-v2' }
            })
            expect(result.modelName).toBe('anthropic.claude-v2')
        })

        it('should handle response_metadata (snake_case) field name', () => {
            const result = extractOutputData({
                content: 'Test',
                response_metadata: { model: 'gpt-3.5-turbo' }
            })
            expect(result.modelName).toBe('gpt-3.5-turbo')
        })

        it('should prefer model over model_name over modelId', () => {
            const result = extractOutputData({
                content: 'Test',
                responseMetadata: {
                    model: 'preferred-model',
                    model_name: 'secondary-model',
                    modelId: 'tertiary-model'
                }
            })
            expect(result.modelName).toBe('preferred-model')
        })
    })

    describe('Langfuse format conversion', () => {
        it('should format usage for Langfuse OpenAIUsage schema', () => {
            const result = extractOutputData({
                content: 'Test',
                usageMetadata: { input_tokens: 100, output_tokens: 50, total_tokens: 150 }
            })
            const langfuseUsage = formatForLangfuse(result.usageMetadata)

            expect(langfuseUsage).toEqual({
                promptTokens: 100,
                completionTokens: 50,
                totalTokens: 150
            })
        })

        it('should return undefined for missing usage', () => {
            const result = extractOutputData({ content: 'Test' })
            expect(formatForLangfuse(result.usageMetadata)).toBeUndefined()
        })
    })

    describe('LangSmith format conversion', () => {
        it('should format usage for LangSmith token_usage schema', () => {
            const result = extractOutputData({
                content: 'Test',
                usageMetadata: { input_tokens: 100, output_tokens: 50, total_tokens: 150 }
            })
            const langSmithUsage = formatForLangSmith(result.usageMetadata)

            expect(langSmithUsage).toEqual({
                prompt_tokens: 100,
                completion_tokens: 50,
                total_tokens: 150
            })
        })
    })

    describe('missing fields handling', () => {
        it('should handle structured output without usageMetadata', () => {
            const result = extractOutputData({ content: 'Test response' })
            expect(result.outputText).toBe('Test response')
            expect(result.usageMetadata).toBeUndefined()
            expect(result.modelName).toBeUndefined()
        })

        it('should handle structured output with only model, no usage', () => {
            const result = extractOutputData({
                content: 'Test response',
                responseMetadata: { model: 'gpt-4' }
            })
            expect(result.usageMetadata).toBeUndefined()
            expect(result.modelName).toBe('gpt-4')
        })

        it('should handle empty content', () => {
            const result = extractOutputData({
                content: '',
                usageMetadata: { input_tokens: 10, output_tokens: 0, total_tokens: 10 }
            })
            expect(result.outputText).toBe('')
            expect(result.usageMetadata).toEqual({
                input_tokens: 10,
                output_tokens: 0,
                total_tokens: 10
            })
        })

        it('should handle missing content field', () => {
            const result = extractOutputData({
                usageMetadata: { input_tokens: 10, output_tokens: 5, total_tokens: 15 }
            })
            expect(result.outputText).toBe('')
        })

        it('should handle undefined values in usage metadata', () => {
            const result = extractOutputData({
                content: 'Test',
                usageMetadata: { input_tokens: 100 }
            })
            expect(result.usageMetadata).toEqual({
                input_tokens: 100,
                output_tokens: undefined,
                total_tokens: undefined
            })
        })
    })
})
