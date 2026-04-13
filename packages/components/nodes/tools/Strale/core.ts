import { z } from 'zod/v3'
import { StructuredTool } from '@langchain/core/tools'

const DEFAULT_BASE_URL = 'https://api.strale.io'

interface StraleToolConfig {
    apiKey?: string
    baseUrl?: string
}

interface StraleExecuteToolConfig extends StraleToolConfig {
    capabilitySlug: string
}

async function straleRequest(baseUrl: string, path: string, body: Record<string, any>, apiKey?: string): Promise<any> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json'
    }
    if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`
    }

    const res = await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
    })

    const data = await res.json()

    if (!res.ok) {
        const errorMessage = data?.error || data?.message || `HTTP ${res.status}: ${res.statusText}`
        throw new Error(errorMessage)
    }

    return data
}

function formatExecuteResult(data: any): string {
    const parts: string[] = []

    if (data.output) {
        parts.push(JSON.stringify(data.output, null, 2))
    }

    const meta: Record<string, any> = {}
    if (data.transaction_id) meta.transaction_id = data.transaction_id
    if (data.quality) meta.quality = data.quality
    if (data.sqs_score !== undefined) meta.sqs_score = data.sqs_score
    if (data.capability_slug) meta.capability_slug = data.capability_slug
    if (data.price_cents !== undefined) meta.price_cents = data.price_cents
    if (data.wallet_balance_cents !== undefined) meta.wallet_balance_cents = data.wallet_balance_cents
    if (data.free_tier !== undefined) meta.free_tier = data.free_tier

    if (Object.keys(meta).length > 0) {
        parts.push(`\n--- Metadata ---\n${JSON.stringify(meta, null, 2)}`)
    }

    return parts.length > 0 ? parts.join('\n') : JSON.stringify(data, null, 2)
}

export class StraleSearchAndExecuteTool extends StructuredTool {
    name = 'strale_search_and_execute'
    description: string
    schema = z.object({
        task: z.string().describe("What you need to do, e.g. 'verify this Swedish company' or 'validate this IBAN'"),
        inputs: z
            .string()
            .optional()
            .describe('JSON object with capability-specific inputs, e.g. {"company_name": "Volvo"}')
    })

    private apiKey?: string
    private baseUrl: string

    constructor(config: StraleToolConfig) {
        super()
        this.apiKey = config.apiKey
        this.baseUrl = config.baseUrl || DEFAULT_BASE_URL

        const authNote = this.apiKey
            ? 'Authenticated — full access to 290+ capabilities.'
            : 'No API key — only free capabilities available (email-validate, dns-lookup, json-repair, url-to-markdown, iban-validate).'

        this.description =
            `Search Strale's data capability marketplace and execute the best match. ` +
            `Strale provides 290+ quality-tested data capabilities including company verification, ` +
            `sanctions screening, VAT validation, invoice extraction, and more. ` +
            `Describe what you need in the "task" field and optionally provide inputs. ${authNote}`
    }

    async _call(arg: { task: string; inputs?: string }): Promise<string> {
        try {
            // Step 1: Search for matching capabilities
            const suggestResult = await straleRequest(
                this.baseUrl,
                '/v1/suggest',
                { task: arg.task, limit: 3 },
                this.apiKey
            )

            const matches = suggestResult.matches || suggestResult.capabilities || suggestResult
            if (!Array.isArray(matches) || matches.length === 0) {
                return JSON.stringify({
                    error: 'no_matching_capability',
                    message: `No capabilities found matching: "${arg.task}". Try rephrasing your request.`
                })
            }

            const bestMatch = matches[0]
            const slug = bestMatch.slug || bestMatch.capability_slug

            // Step 2: Parse inputs
            let inputs: Record<string, any> = {}
            if (arg.inputs) {
                try {
                    inputs = JSON.parse(arg.inputs)
                } catch {
                    return JSON.stringify({
                        error: 'invalid_inputs',
                        message: `Could not parse inputs as JSON: ${arg.inputs}`
                    })
                }
            }

            // Step 3: Execute the best match
            const executeResult = await straleRequest(
                this.baseUrl,
                '/v1/do',
                { capability_slug: slug, inputs },
                this.apiKey
            )

            return formatExecuteResult(executeResult)
        } catch (error) {
            return JSON.stringify({
                error: 'strale_error',
                message: error instanceof Error ? error.message : String(error)
            })
        }
    }
}

export class StraleExecuteTool extends StructuredTool {
    name: string
    description: string
    schema = z.object({
        inputs: z.string().describe('JSON object with capability-specific inputs')
    })

    private apiKey?: string
    private baseUrl: string
    private capabilitySlug: string

    constructor(config: StraleExecuteToolConfig) {
        super()
        this.apiKey = config.apiKey
        this.baseUrl = config.baseUrl || DEFAULT_BASE_URL
        this.capabilitySlug = config.capabilitySlug
        this.name = `strale_${config.capabilitySlug.replace(/-/g, '_')}`

        const authNote = this.apiKey
            ? ''
            : ' (No API key configured — only free capabilities will work.)'

        this.description =
            `Execute the Strale "${config.capabilitySlug}" capability. ` +
            `Provide inputs as a JSON string.${authNote}`
    }

    async _call(arg: { inputs: string }): Promise<string> {
        try {
            let inputs: Record<string, any> = {}
            try {
                inputs = JSON.parse(arg.inputs)
            } catch {
                return JSON.stringify({
                    error: 'invalid_inputs',
                    message: `Could not parse inputs as JSON: ${arg.inputs}`
                })
            }

            const result = await straleRequest(
                this.baseUrl,
                '/v1/do',
                { capability_slug: this.capabilitySlug, inputs },
                this.apiKey
            )

            return formatExecuteResult(result)
        } catch (error) {
            return JSON.stringify({
                error: 'strale_error',
                message: error instanceof Error ? error.message : String(error)
            })
        }
    }
}
