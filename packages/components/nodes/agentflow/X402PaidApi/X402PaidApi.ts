import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getCredentialData, getCredentialParam, parseJsonBody } from '../../../src/utils'
import { checkDenyList } from '../../../src/httpSecurity'
import { privateKeyToAccount } from 'viem/accounts'
import axios, { AxiosResponse, Method, ResponseType } from 'axios'

// @x402/* packages ship modern ESM type declarations that don't resolve under Flowise's current tsconfig.
// We keep Flowise's CommonJS build unchanged and load x402 at runtime via require().
const { x402Client, wrapAxiosWithPayment, x402HTTPClient } = require('@x402/axios') as any
const { ExactEvmScheme } = require('@x402/evm/exact/client') as any
const { UptoEvmScheme } = require('@x402/evm/upto/client') as any

const LOG_PREFIX = '[x402PaidApiAgentflow]'

export interface X402PaymentSummary {
    /** True when PAYMENT-RESPONSE (or parsed settlement) is present on the final response */
    paymentSettled: boolean
    /** Raw PAYMENT-RESPONSE header value (base64 JSON), when present */
    paymentProof?: string | null
    /** Best-effort amount from settlement context (protocol-specific string) */
    amountPaidAtomic?: string | null
    /** Structured settlement from @x402/axios helper, when available */
    paymentMetadata?: unknown
}

class X402PaidApi_Agentflow implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    color: string
    baseClasses: string[]
    documentation?: string
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'HTTP (x402 / Pyrimid)'
        this.name = 'x402PaidApiAgentflow'
        this.version = 1.0
        this.type = 'X402PaidApiAgentflow'
        this.category = 'Agent Flows'
        this.description =
            'Calls a URL with optional query/body; on HTTP 402 completes an x402 USDC payment (Pyrimid-compatible gateways) via @x402/axios and retries automatically. Requires an EVM wallet credential with Base USDC. Example: agentzone-search and other endpoints from the Pyrimid catalog.'
        this.baseClasses = [this.type]
        this.color = '#22c55e'
        this.documentation = 'https://docs.x402.org/getting-started/quickstart-for-buyers'
        this.credential = {
            label: 'x402 EVM Wallet',
            name: 'credential',
            type: 'credential',
            credentialNames: ['x402EvmWallet']
        }
        this.inputs = [
            {
                label: 'Method',
                name: 'method',
                type: 'options',
                options: [
                    { label: 'GET', name: 'GET' },
                    { label: 'POST', name: 'POST' },
                    { label: 'PUT', name: 'PUT' },
                    { label: 'DELETE', name: 'DELETE' },
                    { label: 'PATCH', name: 'PATCH' }
                ],
                default: 'GET'
            },
            {
                label: 'URL',
                name: 'url',
                type: 'string',
                acceptVariable: true,
                description: 'Paid API URL (e.g. https://pyrimid.ai/api/v1/paid/agentzone-search)'
            },
            {
                label: 'Headers',
                name: 'headers',
                type: 'array',
                acceptVariable: true,
                optional: true,
                array: [
                    { label: 'Key', name: 'key', type: 'string', default: '' },
                    { label: 'Value', name: 'value', type: 'string', default: '', acceptVariable: true }
                ]
            },
            {
                label: 'Query Params',
                name: 'queryParams',
                type: 'array',
                acceptVariable: true,
                optional: true,
                array: [
                    { label: 'Key', name: 'key', type: 'string', default: '' },
                    { label: 'Value', name: 'value', type: 'string', default: '', acceptVariable: true }
                ]
            },
            {
                label: 'Body (JSON)',
                name: 'body',
                type: 'string',
                rows: 4,
                optional: true,
                acceptVariable: true,
                description: 'JSON body for non-GET methods',
                placeholder: '{ "q": "agent commerce" }'
            },
            {
                label: 'Affiliate ID (optional)',
                name: 'affiliateId',
                type: 'string',
                optional: true,
                acceptVariable: true,
                description: 'Forwarded as X-Affiliate-ID when set (see Pyrimid vendor middleware / distribution)',
                placeholder: 'af_your_id'
            },
            {
                label: 'Product ID (optional)',
                name: 'productId',
                type: 'string',
                optional: true,
                acceptVariable: true,
                description: 'Forwarded as X-Product-Id when set (custom convention for multi-product gateways)',
                placeholder: 'signals_latest'
            },
            {
                label: 'Max price (USDC atomic)',
                name: 'maxPriceUsdcAtomic',
                type: 'string',
                optional: true,
                acceptVariable: true,
                description:
                    'Optional safety ceiling: refuse payment if quoted amount exceeds this integer (USDC smallest units). Example for $0.10: 100000.',
                placeholder: '100000'
            },
            {
                label: 'Response Type',
                name: 'responseType',
                type: 'options',
                options: [
                    { label: 'JSON', name: 'json' },
                    { label: 'Text', name: 'text' }
                ],
                optional: true,
                default: 'json'
            }
        ]
    }

    async run(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const method = nodeData.inputs?.method as Method
        let url = nodeData.inputs?.url as string
        const headers = nodeData.inputs?.headers as Array<{ key: string; value: string }>
        const queryParams = nodeData.inputs?.queryParams as Array<{ key: string; value: string }>
        const bodyRaw = nodeData.inputs?.body as string | undefined
        const affiliateId = nodeData.inputs?.affiliateId as string | undefined
        const productId = nodeData.inputs?.productId as string | undefined
        const maxPriceUsdcAtomic = (nodeData.inputs?.maxPriceUsdcAtomic as string | undefined)?.trim()
        const responseType = (nodeData.inputs?.responseType as 'json' | 'text') || 'json'

        const state = options.agentflowRuntime?.state as ICommonObject

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const evmPrivateKey = getCredentialParam('evmPrivateKey', credentialData, nodeData) as string | undefined
        const evmRpcUrl = getCredentialParam('evmRpcUrl', credentialData, nodeData) as string | undefined

        if (!url?.trim()) {
            throw new Error(`${LOG_PREFIX} URL is required`)
        }
        url = url.trim()

        if (!evmPrivateKey?.startsWith('0x') || evmPrivateKey.length !== 66) {
            throw new Error(`${LOG_PREFIX} EVM private key must be a 32-byte hex value with 0x prefix (length 66)`)
        }

        const requestHeaders: Record<string, string> = {}

        if (headers && Array.isArray(headers)) {
            for (const h of headers) {
                if (h?.key && h.value !== undefined && h.value !== null) {
                    requestHeaders[h.key] = String(h.value)
                }
            }
        }

        if (affiliateId) {
            requestHeaders['X-Affiliate-ID'] = affiliateId
        }
        if (productId) {
            requestHeaders['X-Product-Id'] = productId
        }

        let queryString = ''
        if (queryParams && Array.isArray(queryParams)) {
            const params = new URLSearchParams()
            for (const p of queryParams) {
                if (p?.key && p.value !== undefined && p.value !== null) {
                    params.append(p.key, String(p.value))
                }
            }
            queryString = params.toString()
        }

        const finalUrl = queryString ? `${url}${url.includes('?') ? '&' : '?'}${queryString}` : url

        await checkDenyList(finalUrl)

        const signer = privateKeyToAccount(evmPrivateKey as `0x${string}`)
        const rpcOptions = evmRpcUrl ? { rpcUrl: evmRpcUrl } : undefined

        const client = new x402Client()

        if (maxPriceUsdcAtomic) {
            let max: bigint
            try {
                max = BigInt(maxPriceUsdcAtomic)
            } catch {
                throw new Error(`${LOG_PREFIX} Max price must be an integer string (USDC atomic units)`)
            }
            client.onBeforePaymentCreation(async (ctx: { selectedRequirements: { amount?: string | number } }) => {
                const raw = ctx?.selectedRequirements?.amount
                if (raw === undefined || raw === null) return undefined
                const requested = typeof raw === 'bigint' ? raw : BigInt(String(raw))
                if (requested > max) {
                    return {
                        abort: true,
                        reason: `${LOG_PREFIX} Quoted payment ${requested} exceeds max authorization ${max} (USDC atomic units)`
                    }
                }
                return undefined
            })
        }

        client.register('eip155:*', new ExactEvmScheme(signer, rpcOptions))
        client.register('eip155:*', new UptoEvmScheme(signer, rpcOptions))

        const axiosInstance = axios.create({
            validateStatus: () => true,
            timeout: 120_000,
            responseType: (responseType === 'text' ? 'text' : 'json') as ResponseType
        })

        const api = wrapAxiosWithPayment(axiosInstance, client)

        let bodyData: unknown = undefined
        if (method !== 'GET' && bodyRaw) {
            bodyData = parseJsonBody(bodyRaw)
            requestHeaders['Content-Type'] = requestHeaders['Content-Type'] || 'application/json'
        }

        const axiosConfig = {
            method: method as Method,
            url: finalUrl,
            headers: requestHeaders,
            data: bodyData
        }

        console.info(`${LOG_PREFIX} ${method} ${finalUrl}`)
        let response: AxiosResponse
        try {
            response = await api.request(axiosConfig)
        } catch (e: any) {
            const msg = e?.response?.data?.error ?? e?.message ?? String(e)
            console.error(`${LOG_PREFIX} Request failed`, e)
            throw new Error(`${LOG_PREFIX} ${msg}`)
        }

        if (response.status === 402) {
            const bodySnippet =
                typeof response.data === 'string' ? response.data.slice(0, 500) : JSON.stringify(response.data)?.slice(0, 500)
            throw new Error(`${LOG_PREFIX} Still received HTTP 402 after x402 attempted settlement. Body (truncated): ${bodySnippet}`)
        }

        if (response.status >= 400) {
            const errText =
                typeof response.data === 'string' ? response.data : response.data?.message ?? JSON.stringify(response.data ?? {})
            throw new Error(`${LOG_PREFIX} HTTP ${response.status} ${response.statusText}: ${errText}`)
        }

        const paymentSummary = extractPaymentSummary(client, response)

        const responseData = responseType === 'json' && typeof response.data === 'string' ? tryParseJson(response.data) : response.data

        return {
            id: nodeData.id,
            name: this.name,
            input: {
                x402PaidApi: axiosConfig,
                affiliateId: affiliateId ?? null,
                productId: productId ?? null,
                maxPriceUsdcAtomic: maxPriceUsdcAtomic ?? null
            },
            output: {
                http: {
                    data: responseData,
                    status: response.status,
                    statusText: response.statusText,
                    headers: response.headers
                },
                x402: paymentSummary
            },
            state
        }
    }
}

function tryParseJson(text: string): unknown {
    try {
        return JSON.parse(text)
    } catch {
        return text
    }
}

function extractPaymentSummary(client: any, response: AxiosResponse): X402PaymentSummary {
    const getHeaderNormalized = (name: string): string | undefined => {
        const keyLower = name.toLowerCase()
        const hdrs = (response.headers ?? {}) as any
        const raw = hdrs[keyLower] ?? hdrs[name] ?? hdrs[keyLower.toUpperCase()] ?? hdrs[name.toUpperCase()]
        if (Array.isArray(raw)) return raw[0]
        return typeof raw === 'string' ? raw : undefined
    }

    let paymentMetadata: unknown
    try {
        paymentMetadata = new x402HTTPClient(client).getPaymentSettleResponse(getHeaderNormalized)
    } catch {
        paymentMetadata = undefined
    }

    const paymentResponseHeader = getHeaderNormalized('payment-response')

    // Server-issued settlement proof (x402 V2); see https://docs.x402.org/core-concepts/http-402
    const paymentProof = paymentResponseHeader

    let amountPaidAtomic: string | null = null
    if (paymentMetadata && typeof paymentMetadata === 'object' && paymentMetadata !== null) {
        const maybe = (paymentMetadata as Record<string, unknown>).amount
        if (maybe !== undefined && maybe !== null) {
            amountPaidAtomic = String(maybe)
        }
    }

    const paymentSettled = Boolean(paymentProof || paymentMetadata)

    return {
        paymentSettled,
        paymentProof,
        amountPaidAtomic,
        paymentMetadata
    }
}

module.exports = { nodeClass: X402PaidApi_Agentflow }
