import { StatusCodes } from 'http-status-codes'
import { nanoid } from 'nanoid'
import { validate as isValidUUID } from 'uuid'
import { ChannelAccount } from '../../database/entities/ChannelAccount'
import { AgentChannel } from '../../database/entities/AgentChannel'
import { ChatFlow } from '../../database/entities/ChatFlow'
import { Credential } from '../../database/entities/Credential'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import { decryptCredentialData } from '../../utils'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'

export const CHANNEL_PROVIDERS = ['telegram', 'whatsapp', 'instagram'] as const
export type ChannelProvider = (typeof CHANNEL_PROVIDERS)[number]

export interface ChannelBindingRuntimeContext {
    provider: ChannelProvider
    agentChannelId: string
    chatflowId: string
    channelAccountId: string
    accountConfig: Record<string, unknown>
    credentialData: Record<string, unknown>
}

interface ChannelAccountInput {
    name: string
    provider: ChannelProvider
    credentialId: string
    config?: Record<string, unknown>
    enabled?: boolean
}

interface AgentChannelInput {
    chatflowId: string
    channelAccountId: string
    webhookPath?: string
    enabled?: boolean
}

const WEBHOOK_PATH_REGEX = /^[A-Za-z0-9_-]{8,128}$/
const WEBHOOK_UNIQUE_INDEX = 'idx_agent_channel_webhookpath'

const validateProvider = (provider: string): ChannelProvider => {
    if (!provider || typeof provider !== 'string') {
        throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'provider is required')
    }
    const normalized = provider.toLowerCase().trim() as ChannelProvider
    if (!CHANNEL_PROVIDERS.includes(normalized)) {
        throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, `Unsupported channel provider: ${provider}`)
    }
    return normalized
}

const parseConfig = (value?: string): Record<string, unknown> => {
    if (!value) return {}
    try {
        const parsed = JSON.parse(value)
        return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
    } catch {
        return {}
    }
}

const getCredentialOrThrow = async (credentialId: string, workspaceId: string): Promise<Credential> => {
    const appServer = getRunningExpressApp()
    const credential = await appServer.AppDataSource.getRepository(Credential).findOneBy({ id: credentialId, workspaceId })
    if (!credential) {
        throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Credential ${credentialId} not found`)
    }
    return credential
}

const validateCredentialForProvider = (provider: ChannelProvider, credential: Credential): void => {
    const expected =
        provider === 'telegram'
            ? ['channelTelegram']
            : provider === 'whatsapp'
            ? ['channelWhatsApp']
            : provider === 'instagram'
            ? ['channelInstagram']
            : []

    if (expected.length && !expected.includes(credential.credentialName)) {
        throw new InternalFlowiseError(
            StatusCodes.BAD_REQUEST,
            `Credential ${credential.id} has invalid type for provider ${provider}. Expected: ${expected.join(', ')}`
        )
    }
}

const getChatflowOrThrow = async (chatflowId: string, workspaceId: string): Promise<ChatFlow> => {
    const appServer = getRunningExpressApp()
    const chatflow = await appServer.AppDataSource.getRepository(ChatFlow).findOneBy({ id: chatflowId, workspaceId })
    if (!chatflow) {
        throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Chatflow ${chatflowId} not found`)
    }
    return chatflow
}

const getChannelAccountById = async (id: string, workspaceId: string): Promise<ChannelAccount> => {
    const appServer = getRunningExpressApp()
    const account = await appServer.AppDataSource.getRepository(ChannelAccount).findOneBy({ id, workspaceId })
    if (!account) {
        throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Channel account ${id} not found`)
    }
    return account
}

const validateWebhookPath = (webhookPath: string): string => {
    if (!WEBHOOK_PATH_REGEX.test(webhookPath)) {
        throw new InternalFlowiseError(
            StatusCodes.BAD_REQUEST,
            'webhookPath must be 8-128 chars and can only include letters, numbers, underscore, and hyphen'
        )
    }
    return webhookPath
}

const ensureWebhookPathAvailable = async (webhookPath: string, existingBindingId?: string): Promise<void> => {
    const appServer = getRunningExpressApp()
    const existingBinding = await appServer.AppDataSource.getRepository(AgentChannel).findOneBy({ webhookPath })
    if (existingBinding && existingBinding.id !== existingBindingId) {
        throw new InternalFlowiseError(StatusCodes.CONFLICT, 'webhookPath is already in use')
    }
}

const ensureAccountFlowBindingAvailable = async (
    workspaceId: string,
    chatflowId: string,
    channelAccountId: string,
    existingBindingId?: string
): Promise<void> => {
    const appServer = getRunningExpressApp()
    const existingBinding = await appServer.AppDataSource.getRepository(AgentChannel).findOneBy({
        workspaceId,
        chatflowId,
        channelAccountId
    })
    if (existingBinding && existingBinding.id !== existingBindingId) {
        throw new InternalFlowiseError(
            StatusCodes.CONFLICT,
            'A binding already exists for this flow and channel account. Use a different account or update the existing binding.'
        )
    }
}

const isWebhookPathUniqueViolation = (error: unknown): boolean => {
    const message = getErrorMessage(error).toLowerCase()
    return (
        message.includes(WEBHOOK_UNIQUE_INDEX) ||
        (message.includes('webhookpath') && (message.includes('duplicate') || message.includes('unique constraint')))
    )
}

const createChannelAccount = async (input: ChannelAccountInput, workspaceId: string): Promise<ChannelAccount> => {
    try {
        if (!input.name?.trim()) throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'name is required')
        if (!isValidUUID(input.credentialId)) throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'credentialId must be a valid UUID')

        const provider = validateProvider(input.provider)
        const credential = await getCredentialOrThrow(input.credentialId, workspaceId)
        validateCredentialForProvider(provider, credential)

        const appServer = getRunningExpressApp()
        const repo = appServer.AppDataSource.getRepository(ChannelAccount)
        const account = repo.create({
            name: input.name.trim(),
            provider,
            credentialId: input.credentialId,
            config: JSON.stringify(input.config ?? {}),
            enabled: input.enabled ?? true,
            workspaceId
        })

        return await repo.save(account)
    } catch (error) {
        if (error instanceof InternalFlowiseError) throw error
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: channelsService.createChannelAccount - ${getErrorMessage(error)}`
        )
    }
}

const getAllChannelAccounts = async (workspaceId: string, provider?: string): Promise<ChannelAccount[]> => {
    try {
        const appServer = getRunningExpressApp()
        const repo = appServer.AppDataSource.getRepository(ChannelAccount)
        if (provider) {
            return await repo.findBy({ workspaceId, provider: validateProvider(provider) })
        }
        return await repo.findBy({ workspaceId })
    } catch (error) {
        if (error instanceof InternalFlowiseError) throw error
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: channelsService.getAllChannelAccounts - ${getErrorMessage(error)}`
        )
    }
}

const updateChannelAccount = async (id: string, input: Partial<ChannelAccountInput>, workspaceId: string): Promise<ChannelAccount> => {
    try {
        const appServer = getRunningExpressApp()
        const repo = appServer.AppDataSource.getRepository(ChannelAccount)
        const account = await getChannelAccountById(id, workspaceId)

        if (input.provider) account.provider = validateProvider(input.provider)
        if (input.name !== undefined) {
            const name = input.name.trim()
            if (!name) throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'name is required')
            account.name = name
        }
        if (input.credentialId !== undefined) {
            if (!isValidUUID(input.credentialId))
                throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'credentialId must be a valid UUID')
            const credential = await getCredentialOrThrow(input.credentialId, workspaceId)
            validateCredentialForProvider(account.provider as ChannelProvider, credential)
            account.credentialId = input.credentialId
        }
        if (input.provider !== undefined && input.credentialId === undefined) {
            const existingCredential = await getCredentialOrThrow(account.credentialId, workspaceId)
            validateCredentialForProvider(account.provider as ChannelProvider, existingCredential)
        }
        if (input.config !== undefined) account.config = JSON.stringify(input.config)
        if (input.enabled !== undefined) account.enabled = input.enabled

        return await repo.save(account)
    } catch (error) {
        if (error instanceof InternalFlowiseError) throw error
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: channelsService.updateChannelAccount - ${getErrorMessage(error)}`
        )
    }
}

const deleteChannelAccount = async (id: string, workspaceId: string): Promise<void> => {
    try {
        const appServer = getRunningExpressApp()
        const bindingCount = await appServer.AppDataSource.getRepository(AgentChannel).countBy({ channelAccountId: id, workspaceId })
        if (bindingCount > 0) {
            throw new InternalFlowiseError(StatusCodes.CONFLICT, 'Channel account is in use by one or more agent bindings')
        }

        const result = await appServer.AppDataSource.getRepository(ChannelAccount).delete({ id, workspaceId })
        if (!result.affected) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Channel account ${id} not found`)
        }
    } catch (error) {
        if (error instanceof InternalFlowiseError) throw error
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: channelsService.deleteChannelAccount - ${getErrorMessage(error)}`
        )
    }
}

const createAgentChannelBinding = async (input: AgentChannelInput, workspaceId: string): Promise<AgentChannel> => {
    try {
        if (!isValidUUID(input.chatflowId)) throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'chatflowId must be a valid UUID')
        if (!isValidUUID(input.channelAccountId))
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'channelAccountId must be a valid UUID')

        await getChatflowOrThrow(input.chatflowId, workspaceId)
        const account = await getChannelAccountById(input.channelAccountId, workspaceId)
        const provider = validateProvider(account.provider)

        const appServer = getRunningExpressApp()
        const repo = appServer.AppDataSource.getRepository(AgentChannel)
        const webhookPath = validateWebhookPath(input.webhookPath?.trim() || nanoid(32))
        await ensureWebhookPathAvailable(webhookPath)
        await ensureAccountFlowBindingAvailable(workspaceId, input.chatflowId, input.channelAccountId)

        const binding = repo.create({
            chatflowId: input.chatflowId,
            channelAccountId: input.channelAccountId,
            provider,
            webhookPath,
            enabled: input.enabled ?? true,
            workspaceId
        })

        return await repo.save(binding)
    } catch (error) {
        if (isWebhookPathUniqueViolation(error)) {
            throw new InternalFlowiseError(StatusCodes.CONFLICT, 'webhookPath is already in use')
        }
        if (error instanceof InternalFlowiseError) throw error
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: channelsService.createAgentChannelBinding - ${getErrorMessage(error)}`
        )
    }
}

const getAgentChannelBindings = async (workspaceId: string, chatflowId?: string): Promise<AgentChannel[]> => {
    try {
        const appServer = getRunningExpressApp()
        const repo = appServer.AppDataSource.getRepository(AgentChannel)
        if (chatflowId) {
            if (!isValidUUID(chatflowId)) {
                throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'chatflowId must be a valid UUID')
            }
            return await repo.findBy({ workspaceId, chatflowId })
        }
        return await repo.findBy({ workspaceId })
    } catch (error) {
        if (error instanceof InternalFlowiseError) throw error
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: channelsService.getAgentChannelBindings - ${getErrorMessage(error)}`
        )
    }
}

const updateAgentChannelBinding = async (id: string, input: Partial<AgentChannelInput>, workspaceId: string): Promise<AgentChannel> => {
    try {
        const appServer = getRunningExpressApp()
        const repo = appServer.AppDataSource.getRepository(AgentChannel)
        const binding = await repo.findOneBy({ id, workspaceId })
        if (!binding) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Agent channel binding ${id} not found`)
        }

        if (input.chatflowId !== undefined) {
            if (!isValidUUID(input.chatflowId)) throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'chatflowId must be a valid UUID')
            await getChatflowOrThrow(input.chatflowId, workspaceId)
            binding.chatflowId = input.chatflowId
        }
        if (input.channelAccountId !== undefined) {
            if (!isValidUUID(input.channelAccountId)) {
                throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'channelAccountId must be a valid UUID')
            }
            const account = await getChannelAccountById(input.channelAccountId, workspaceId)
            const provider = validateProvider(account.provider)
            binding.channelAccountId = input.channelAccountId
            binding.provider = provider
        }
        if (input.webhookPath !== undefined) {
            const webhookPath = validateWebhookPath(input.webhookPath.trim())
            await ensureWebhookPathAvailable(webhookPath, binding.id)
            binding.webhookPath = webhookPath
        }
        if (input.enabled !== undefined) binding.enabled = input.enabled
        await ensureAccountFlowBindingAvailable(workspaceId, binding.chatflowId, binding.channelAccountId, binding.id)

        return await repo.save(binding)
    } catch (error) {
        if (isWebhookPathUniqueViolation(error)) {
            throw new InternalFlowiseError(StatusCodes.CONFLICT, 'webhookPath is already in use')
        }
        if (error instanceof InternalFlowiseError) throw error
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: channelsService.updateAgentChannelBinding - ${getErrorMessage(error)}`
        )
    }
}

const deleteAgentChannelBinding = async (id: string, workspaceId: string): Promise<void> => {
    try {
        const appServer = getRunningExpressApp()
        const result = await appServer.AppDataSource.getRepository(AgentChannel).delete({ id, workspaceId })
        if (!result.affected) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Agent channel binding ${id} not found`)
        }
    } catch (error) {
        if (error instanceof InternalFlowiseError) throw error
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: channelsService.deleteAgentChannelBinding - ${getErrorMessage(error)}`
        )
    }
}

const resolveRuntimeContextByWebhookPath = async (provider: string, webhookPath: string): Promise<ChannelBindingRuntimeContext> => {
    try {
        const normalizedProvider = validateProvider(provider)
        const normalizedWebhookPath = webhookPath.trim()
        if (!normalizedWebhookPath) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Webhook path is required')
        }

        const appServer = getRunningExpressApp()
        const binding = await appServer.AppDataSource.getRepository(AgentChannel).findOneBy({
            webhookPath: normalizedWebhookPath,
            provider: normalizedProvider
        })

        if (!binding || !binding.enabled) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, 'Webhook binding not found')
        }

        const account = await appServer.AppDataSource.getRepository(ChannelAccount).findOneBy({
            id: binding.channelAccountId,
            workspaceId: binding.workspaceId
        })

        if (!account || !account.enabled) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, 'Channel account not found')
        }

        const credential = await appServer.AppDataSource.getRepository(Credential).findOneBy({
            id: account.credentialId,
            workspaceId: binding.workspaceId
        })

        if (!credential) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Credential ${account.credentialId} not found`)
        }

        const credentialData = await decryptCredentialData(credential.encryptedData)

        return {
            provider: normalizedProvider,
            agentChannelId: binding.id,
            chatflowId: binding.chatflowId,
            channelAccountId: account.id,
            accountConfig: parseConfig(account.config),
            credentialData: credentialData as Record<string, unknown>
        }
    } catch (error) {
        if (error instanceof InternalFlowiseError) throw error
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: channelsService.resolveRuntimeContextByWebhookPath - ${getErrorMessage(error)}`
        )
    }
}

export default {
    createChannelAccount,
    getAllChannelAccounts,
    updateChannelAccount,
    deleteChannelAccount,
    createAgentChannelBinding,
    getAgentChannelBindings,
    updateAgentChannelBinding,
    deleteAgentChannelBinding,
    resolveRuntimeContextByWebhookPath
}
