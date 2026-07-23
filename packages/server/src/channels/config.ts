import { ChannelConfigurationError } from './errors'
import { ChannelRequestContext } from './types'

export interface TelegramRuntimeConfig {
    botToken: string
    webhookSecret?: string
    disableWebPagePreview: boolean
}

export interface MetaRuntimeConfig {
    accessToken: string
    appSecret: string
    verifyToken?: string
}

const getCredentialData = (context: ChannelRequestContext): Record<string, unknown> => {
    const data = context.credentialData
    if (!data || typeof data !== 'object') {
        throw new ChannelConfigurationError('Credential data missing from channel context')
    }
    return data
}

const getAccountConfig = (context: ChannelRequestContext): Record<string, unknown> => {
    const data = context.accountConfig
    if (!data || typeof data !== 'object') return {}
    return data
}

export const resolveTelegramConfig = (context: ChannelRequestContext): TelegramRuntimeConfig => {
    const credentialData = getCredentialData(context)
    const accountConfig = getAccountConfig(context)

    const botToken = typeof credentialData.botToken === 'string' ? credentialData.botToken : ''
    if (!botToken) {
        throw new ChannelConfigurationError('Telegram bot token is missing')
    }

    const webhookSecret = typeof credentialData.webhookSecret === 'string' ? credentialData.webhookSecret : undefined
    const disableWebPagePreview = typeof accountConfig.disableWebPagePreview === 'boolean' ? accountConfig.disableWebPagePreview : true

    return {
        botToken,
        webhookSecret,
        disableWebPagePreview
    }
}

export const resolveMetaConfig = (context: ChannelRequestContext): MetaRuntimeConfig => {
    const credentialData = getCredentialData(context)

    const accessToken = typeof credentialData.accessToken === 'string' ? credentialData.accessToken : ''
    const appSecret = typeof credentialData.appSecret === 'string' ? credentialData.appSecret : ''
    const verifyToken = typeof credentialData.verifyToken === 'string' ? credentialData.verifyToken : undefined

    if (!accessToken) {
        throw new ChannelConfigurationError('Meta access token is missing')
    }

    if (!appSecret) {
        throw new ChannelConfigurationError('Meta app secret is missing')
    }

    return {
        accessToken,
        appSecret,
        verifyToken
    }
}

export const resolveWhatsappPhoneNumberId = (context: ChannelRequestContext): string => {
    const accountConfig = getAccountConfig(context)
    const credentialData = getCredentialData(context)

    const phoneNumberIdFromAccount = typeof accountConfig.phoneNumberId === 'string' ? accountConfig.phoneNumberId : ''
    const phoneNumberIdFromCredential =
        typeof credentialData.phoneNumberId === 'string'
            ? credentialData.phoneNumberId
            : typeof credentialData.phone_number_id === 'string'
            ? credentialData.phone_number_id
            : ''

    const phoneNumberId = phoneNumberIdFromAccount || phoneNumberIdFromCredential

    if (!phoneNumberId) {
        throw new ChannelConfigurationError(
            'WhatsApp phoneNumberId is missing. Set it in channel account config or channelWhatsApp credential'
        )
    }

    return phoneNumberId
}

export const resolveInstagramUserId = (context: ChannelRequestContext): string => {
    const accountConfig = getAccountConfig(context)
    const credentialData = getCredentialData(context)
    const instagramUserIdFromAccount = typeof accountConfig.instagramUserId === 'string' ? accountConfig.instagramUserId : ''
    const instagramUserIdFromCredential =
        typeof credentialData.instagramUserId === 'string'
            ? credentialData.instagramUserId
            : typeof credentialData.instagram_user_id === 'string'
            ? credentialData.instagram_user_id
            : ''
    const instagramUserId = instagramUserIdFromAccount || instagramUserIdFromCredential

    if (!instagramUserId) {
        throw new ChannelConfigurationError(
            'Instagram instagramUserId is missing. Set it in channel account config or channelInstagram credential'
        )
    }

    return instagramUserId
}
