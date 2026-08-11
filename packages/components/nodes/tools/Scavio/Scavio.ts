import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { convertMultiOptionsToStringArray, getCredentialData, getCredentialParam } from '../../../src/utils'
import {
    createScavioTools,
    toNodeOptions,
    GOOGLE_ENDPOINTS,
    YOUTUBE_ENDPOINTS,
    AMAZON_ENDPOINTS,
    WALMART_ENDPOINTS,
    REDDIT_ENDPOINTS,
    TIKTOK_ENDPOINTS,
    TIKTOK_SHOP_ENDPOINTS,
    INSTAGRAM_ENDPOINTS,
    X_ENDPOINTS,
    LINKEDIN_ENDPOINTS
} from './core'

const ACTION_INPUT_BY_PLATFORM: Record<string, string> = {
    google: 'googleActions',
    youtube: 'youtubeActions',
    amazon: 'amazonActions',
    walmart: 'walmartActions',
    reddit: 'redditActions',
    tiktok: 'tiktokActions',
    tiktokShop: 'tiktokShopActions',
    instagram: 'instagramActions',
    x: 'xActions',
    linkedin: 'linkedinActions'
}

class Scavio_Tools implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'Scavio'
        this.name = 'scavioAPI'
        this.version = 1.0
        this.type = 'Scavio'
        this.icon = 'scavio.svg'
        this.category = 'Tools'
        this.description =
            'Real-time search API for AI agents - Google, YouTube, Amazon, Walmart, Reddit, TikTok, TikTok Shop, Instagram, X and LinkedIn as clean JSON'
        this.inputs = [
            {
                label: 'Platform',
                name: 'scavioType',
                type: 'options',
                options: [
                    {
                        label: 'Google',
                        name: 'google',
                        description: '14 endpoints - search, AI mode, maps, shopping, flights, hotels, news, trends'
                    },
                    {
                        label: 'YouTube',
                        name: 'youtube',
                        description: '15 endpoints - search, video, comments, transcript, channels, streams'
                    },
                    {
                        label: 'Amazon',
                        name: 'amazon',
                        description: '3 endpoints - search, product, offers'
                    },
                    {
                        label: 'Walmart',
                        name: 'walmart',
                        description: '2 endpoints - search, product'
                    },
                    {
                        label: 'Reddit',
                        name: 'reddit',
                        description: '12 endpoints - search, posts, comments, subreddits, users'
                    },
                    {
                        label: 'TikTok',
                        name: 'tiktok',
                        description: '11 endpoints - profiles, videos, comments, search, hashtags'
                    },
                    {
                        label: 'TikTok Shop',
                        name: 'tiktokShop',
                        description: '8 endpoints - search, products, reviews, categories, shops'
                    },
                    {
                        label: 'Instagram',
                        name: 'instagram',
                        description: '12 endpoints - profiles, posts, reels, stories, comments, search'
                    },
                    {
                        label: 'X (Twitter)',
                        name: 'x',
                        description: '11 endpoints - search, posts, replies, users, trending'
                    },
                    {
                        label: 'LinkedIn',
                        name: 'linkedin',
                        description: '9 endpoints - people, companies, posts, jobs'
                    }
                ],
                default: 'google'
            },
            {
                label: 'Google Actions',
                name: 'googleActions',
                type: 'multiOptions',
                options: toNodeOptions(GOOGLE_ENDPOINTS),
                show: {
                    scavioType: ['google']
                }
            },
            {
                label: 'YouTube Actions',
                name: 'youtubeActions',
                type: 'multiOptions',
                options: toNodeOptions(YOUTUBE_ENDPOINTS),
                show: {
                    scavioType: ['youtube']
                }
            },
            {
                label: 'Amazon Actions',
                name: 'amazonActions',
                type: 'multiOptions',
                options: toNodeOptions(AMAZON_ENDPOINTS),
                show: {
                    scavioType: ['amazon']
                }
            },
            {
                label: 'Walmart Actions',
                name: 'walmartActions',
                type: 'multiOptions',
                options: toNodeOptions(WALMART_ENDPOINTS),
                show: {
                    scavioType: ['walmart']
                }
            },
            {
                label: 'Reddit Actions',
                name: 'redditActions',
                type: 'multiOptions',
                options: toNodeOptions(REDDIT_ENDPOINTS),
                show: {
                    scavioType: ['reddit']
                }
            },
            {
                label: 'TikTok Actions',
                name: 'tiktokActions',
                type: 'multiOptions',
                options: toNodeOptions(TIKTOK_ENDPOINTS),
                show: {
                    scavioType: ['tiktok']
                }
            },
            {
                label: 'TikTok Shop Actions',
                name: 'tiktokShopActions',
                type: 'multiOptions',
                options: toNodeOptions(TIKTOK_SHOP_ENDPOINTS),
                show: {
                    scavioType: ['tiktokShop']
                }
            },
            {
                label: 'Instagram Actions',
                name: 'instagramActions',
                type: 'multiOptions',
                options: toNodeOptions(INSTAGRAM_ENDPOINTS),
                show: {
                    scavioType: ['instagram']
                }
            },
            {
                label: 'X Actions',
                name: 'xActions',
                type: 'multiOptions',
                options: toNodeOptions(X_ENDPOINTS),
                show: {
                    scavioType: ['x']
                }
            },
            {
                label: 'LinkedIn Actions',
                name: 'linkedinActions',
                type: 'multiOptions',
                options: toNodeOptions(LINKEDIN_ENDPOINTS),
                show: {
                    scavioType: ['linkedin']
                }
            },
            // Google defaults - applied to the Google endpoints that accept them
            {
                label: 'Country Code',
                name: 'gl',
                type: 'string',
                placeholder: 'us',
                description: 'Two-letter country code (ISO 3166-1 alpha-2), e.g. us. Google Trends uses its own geo argument instead',
                additionalParams: true,
                optional: true,
                show: {
                    scavioType: ['google']
                }
            },
            {
                label: 'Language',
                name: 'hl',
                type: 'string',
                placeholder: 'en',
                description: 'Two-letter language code, e.g. en',
                additionalParams: true,
                optional: true,
                show: {
                    scavioType: ['google']
                }
            },
            {
                label: 'Google Domain',
                name: 'googleDomain',
                type: 'string',
                placeholder: 'google.com',
                description: 'Google domain to use, e.g. google.co.uk',
                additionalParams: true,
                optional: true,
                show: {
                    scavioType: ['google']
                }
            },
            {
                label: 'Location',
                name: 'location',
                type: 'string',
                placeholder: 'Austin, Texas, United States',
                description: 'Canonical location string to originate the search from',
                additionalParams: true,
                optional: true,
                show: {
                    scavioType: ['google']
                }
            },
            {
                label: 'Device',
                name: 'device',
                type: 'options',
                options: [
                    { label: 'Desktop', name: 'desktop' },
                    { label: 'Mobile', name: 'mobile' }
                ],
                default: 'desktop',
                additionalParams: true,
                optional: true,
                show: {
                    scavioType: ['google']
                }
            },
            // Amazon default
            {
                label: 'Marketplace Country',
                name: 'amazonCountry',
                type: 'string',
                placeholder: 'us',
                description: 'Two-letter marketplace code, e.g. us for amazon.com or gb for amazon.co.uk. Defaults to us',
                additionalParams: true,
                optional: true,
                show: {
                    scavioType: ['amazon']
                }
            }
        ]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['scavioApi']
        }
        this.baseClasses = [this.type, 'Tool']
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const scavioApiKey = getCredentialParam('scavioApiKey', credentialData, nodeData)
        if (!scavioApiKey) {
            throw new Error('Scavio API Key is missing. Please connect your Scavio API credential.')
        }

        const platform = nodeData.inputs?.scavioType as string
        const actionInput = ACTION_INPUT_BY_PLATFORM[platform]
        const actions = actionInput ? convertMultiOptionsToStringArray(nodeData.inputs?.[actionInput]) : []

        const defaultParams = this.transformNodeInputsToToolArgs(nodeData)

        return createScavioTools({
            platform,
            actions,
            apiKey: scavioApiKey,
            defaultParams
        })
    }

    transformNodeInputsToToolArgs(nodeData: INodeData): ICommonObject {
        const defaultParams: ICommonObject = {}

        // Google
        if (nodeData.inputs?.gl) defaultParams.gl = nodeData.inputs.gl
        if (nodeData.inputs?.hl) defaultParams.hl = nodeData.inputs.hl
        if (nodeData.inputs?.googleDomain) defaultParams.google_domain = nodeData.inputs.googleDomain
        if (nodeData.inputs?.location) defaultParams.location = nodeData.inputs.location
        if (nodeData.inputs?.device) defaultParams.device = nodeData.inputs.device

        // Amazon
        if (nodeData.inputs?.amazonCountry) defaultParams.country = nodeData.inputs.amazonCountry

        return defaultParams
    }
}

module.exports = { nodeClass: Scavio_Tools }
