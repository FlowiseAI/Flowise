import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { convertMultiOptionsToStringArray, getCredentialData, getCredentialParam } from '../../../src/utils'
import {
    createScavioTools,
    toNodeOptions,
    GOOGLE_ENDPOINTS,
    YOUTUBE_ENDPOINTS,
    AMAZON_ENDPOINTS,
    REDDIT_ENDPOINTS,
    TIKTOK_ENDPOINTS,
    TIKTOK_SHOP_ENDPOINTS,
    INSTAGRAM_ENDPOINTS,
    X_ENDPOINTS,
    LINKEDIN_ENDPOINTS,
    WALMART_ENDPOINTS,
    THREADS_ENDPOINTS,
    KUAISHOU_ENDPOINTS,
    EBAY_ENDPOINTS,
    TARGET_ENDPOINTS,
    HOME_DEPOT_ENDPOINTS,
    ZILLOW_ENDPOINTS,
    BOOKING_ENDPOINTS,
    TRIPADVISOR_ENDPOINTS,
    INDEED_ENDPOINTS,
    AIRBNB_ENDPOINTS,
    GLASSDOOR_ENDPOINTS,
    YELP_ENDPOINTS,
    APP_STORE_ENDPOINTS,
    GOOGLE_PLAY_ENDPOINTS,
    SEC_ENDPOINTS,
    REDFIN_ENDPOINTS,
    COMPANIES_HOUSE_ENDPOINTS,
    G2_ENDPOINTS,
    CAPTERRA_ENDPOINTS,
    GOOGLE_ADS_ENDPOINTS,
    META_ADS_ENDPOINTS,
    EXTRACT_ENDPOINTS
} from './core'

const ACTION_INPUT_BY_PLATFORM: Record<string, string> = {
    google: 'googleActions',
    youtube: 'youtubeActions',
    amazon: 'amazonActions',
    reddit: 'redditActions',
    tiktok: 'tiktokActions',
    tiktokShop: 'tiktokShopActions',
    instagram: 'instagramActions',
    x: 'xActions',
    linkedin: 'linkedinActions',
    walmart: 'walmartActions',
    threads: 'threadsActions',
    kuaishou: 'kuaishouActions',
    ebay: 'ebayActions',
    target: 'targetActions',
    homeDepot: 'homeDepotActions',
    zillow: 'zillowActions',
    booking: 'bookingActions',
    tripadvisor: 'tripadvisorActions',
    indeed: 'indeedActions',
    airbnb: 'airbnbActions',
    glassdoor: 'glassdoorActions',
    yelp: 'yelpActions',
    appStore: 'appStoreActions',
    googlePlay: 'googlePlayActions',
    sec: 'secActions',
    redfin: 'redfinActions',
    companiesHouse: 'companiesHouseActions',
    g2: 'g2Actions',
    capterra: 'capterraActions',
    googleAds: 'googleAdsActions',
    metaAds: 'metaAdsActions',
    extract: 'extractActions'
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
            'Real-time search API for AI agents - 188 endpoints across 31 platforms (Google, YouTube, Amazon, Walmart, eBay, Zillow, Redfin, Booking, Airbnb, Indeed, Glassdoor, G2, SEC EDGAR, the Meta Ad Library, Reddit, TikTok, Instagram, Threads, X, LinkedIn and more) plus URL extraction, as clean JSON'
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
                    },
                    {
                        label: 'Walmart',
                        name: 'walmart',
                        description: '7 endpoints - search, product, reviews, category, offers, seller and more'
                    },
                    {
                        label: 'Threads',
                        name: 'threads',
                        description: '6 endpoints - profile, user posts, user replies, post, post comments, search users'
                    },
                    {
                        label: 'Kuaishou (China)',
                        name: 'kuaishou',
                        description: '14 endpoints - profile, user posts, user live, user resolve, video, video comments and more'
                    },
                    {
                        label: 'eBay',
                        name: 'ebay',
                        description: '3 endpoints - search, product, seller'
                    },
                    {
                        label: 'Target',
                        name: 'target',
                        description: '4 endpoints - search, category, product, reviews'
                    },
                    {
                        label: 'Home Depot',
                        name: 'homeDepot',
                        description: '3 endpoints - search, product, reviews'
                    },
                    {
                        label: 'Zillow',
                        name: 'zillow',
                        description: '3 endpoints - search, property, reviews'
                    },
                    {
                        label: 'Booking.com',
                        name: 'booking',
                        description: '3 endpoints - search, hotel, reviews'
                    },
                    {
                        label: 'TripAdvisor',
                        name: 'tripadvisor',
                        description: '4 endpoints - locations, search, location, reviews'
                    },
                    {
                        label: 'Indeed',
                        name: 'indeed',
                        description: '4 endpoints - search, job, company, company reviews'
                    },
                    {
                        label: 'Airbnb',
                        name: 'airbnb',
                        description: '3 endpoints - search, listing, reviews'
                    },
                    {
                        label: 'Glassdoor',
                        name: 'glassdoor',
                        description: '4 endpoints - companies, company, reviews, salaries'
                    },
                    {
                        label: 'Yelp',
                        name: 'yelp',
                        description: '3 endpoints - search, business, reviews'
                    },
                    {
                        label: 'Apple App Store',
                        name: 'appStore',
                        description: '3 endpoints - search, app, reviews'
                    },
                    {
                        label: 'Google Play',
                        name: 'googlePlay',
                        description: '3 endpoints - search, app, reviews'
                    },
                    {
                        label: 'SEC EDGAR',
                        name: 'sec',
                        description: '6 endpoints - lookup, company, filings, concept, facts, search'
                    },
                    {
                        label: 'Redfin',
                        name: 'redfin',
                        description: '3 endpoints - search, property, market'
                    },
                    {
                        label: 'Companies House',
                        name: 'companiesHouse',
                        description: '4 endpoints - search, company, officers, filing history'
                    },
                    {
                        label: 'G2',
                        name: 'g2',
                        description: '3 endpoints - search, product, reviews'
                    },
                    {
                        label: 'Capterra',
                        name: 'capterra',
                        description: '3 endpoints - search, product, reviews'
                    },
                    {
                        label: 'Google Ads Transparency',
                        name: 'googleAds',
                        description: '3 endpoints - search, advertisers, creative'
                    },
                    {
                        label: 'Meta Ad Library',
                        name: 'metaAds',
                        description: '3 endpoints - search, advertiser, ad'
                    },
                    {
                        label: 'Extract (any URL)',
                        name: 'extract',
                        description: '2 endpoints - extract, extract'
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
                label: 'Threads Actions',
                name: 'threadsActions',
                type: 'multiOptions',
                options: toNodeOptions(THREADS_ENDPOINTS),
                show: {
                    scavioType: ['threads']
                }
            },
            {
                label: 'Kuaishou (China) Actions',
                name: 'kuaishouActions',
                type: 'multiOptions',
                options: toNodeOptions(KUAISHOU_ENDPOINTS),
                show: {
                    scavioType: ['kuaishou']
                }
            },
            {
                label: 'eBay Actions',
                name: 'ebayActions',
                type: 'multiOptions',
                options: toNodeOptions(EBAY_ENDPOINTS),
                show: {
                    scavioType: ['ebay']
                }
            },
            {
                label: 'Target Actions',
                name: 'targetActions',
                type: 'multiOptions',
                options: toNodeOptions(TARGET_ENDPOINTS),
                show: {
                    scavioType: ['target']
                }
            },
            {
                label: 'Home Depot Actions',
                name: 'homeDepotActions',
                type: 'multiOptions',
                options: toNodeOptions(HOME_DEPOT_ENDPOINTS),
                show: {
                    scavioType: ['homeDepot']
                }
            },
            {
                label: 'Zillow Actions',
                name: 'zillowActions',
                type: 'multiOptions',
                options: toNodeOptions(ZILLOW_ENDPOINTS),
                show: {
                    scavioType: ['zillow']
                }
            },
            {
                label: 'Booking.com Actions',
                name: 'bookingActions',
                type: 'multiOptions',
                options: toNodeOptions(BOOKING_ENDPOINTS),
                show: {
                    scavioType: ['booking']
                }
            },
            {
                label: 'TripAdvisor Actions',
                name: 'tripadvisorActions',
                type: 'multiOptions',
                options: toNodeOptions(TRIPADVISOR_ENDPOINTS),
                show: {
                    scavioType: ['tripadvisor']
                }
            },
            {
                label: 'Indeed Actions',
                name: 'indeedActions',
                type: 'multiOptions',
                options: toNodeOptions(INDEED_ENDPOINTS),
                show: {
                    scavioType: ['indeed']
                }
            },
            {
                label: 'Airbnb Actions',
                name: 'airbnbActions',
                type: 'multiOptions',
                options: toNodeOptions(AIRBNB_ENDPOINTS),
                show: {
                    scavioType: ['airbnb']
                }
            },
            {
                label: 'Glassdoor Actions',
                name: 'glassdoorActions',
                type: 'multiOptions',
                options: toNodeOptions(GLASSDOOR_ENDPOINTS),
                show: {
                    scavioType: ['glassdoor']
                }
            },
            {
                label: 'Yelp Actions',
                name: 'yelpActions',
                type: 'multiOptions',
                options: toNodeOptions(YELP_ENDPOINTS),
                show: {
                    scavioType: ['yelp']
                }
            },
            {
                label: 'Apple App Store Actions',
                name: 'appStoreActions',
                type: 'multiOptions',
                options: toNodeOptions(APP_STORE_ENDPOINTS),
                show: {
                    scavioType: ['appStore']
                }
            },
            {
                label: 'Google Play Actions',
                name: 'googlePlayActions',
                type: 'multiOptions',
                options: toNodeOptions(GOOGLE_PLAY_ENDPOINTS),
                show: {
                    scavioType: ['googlePlay']
                }
            },
            {
                label: 'SEC EDGAR Actions',
                name: 'secActions',
                type: 'multiOptions',
                options: toNodeOptions(SEC_ENDPOINTS),
                show: {
                    scavioType: ['sec']
                }
            },
            {
                label: 'Redfin Actions',
                name: 'redfinActions',
                type: 'multiOptions',
                options: toNodeOptions(REDFIN_ENDPOINTS),
                show: {
                    scavioType: ['redfin']
                }
            },
            {
                label: 'Companies House Actions',
                name: 'companiesHouseActions',
                type: 'multiOptions',
                options: toNodeOptions(COMPANIES_HOUSE_ENDPOINTS),
                show: {
                    scavioType: ['companiesHouse']
                }
            },
            {
                label: 'G2 Actions',
                name: 'g2Actions',
                type: 'multiOptions',
                options: toNodeOptions(G2_ENDPOINTS),
                show: {
                    scavioType: ['g2']
                }
            },
            {
                label: 'Capterra Actions',
                name: 'capterraActions',
                type: 'multiOptions',
                options: toNodeOptions(CAPTERRA_ENDPOINTS),
                show: {
                    scavioType: ['capterra']
                }
            },
            {
                label: 'Google Ads Transparency Actions',
                name: 'googleAdsActions',
                type: 'multiOptions',
                options: toNodeOptions(GOOGLE_ADS_ENDPOINTS),
                show: {
                    scavioType: ['googleAds']
                }
            },
            {
                label: 'Meta Ad Library Actions',
                name: 'metaAdsActions',
                type: 'multiOptions',
                options: toNodeOptions(META_ADS_ENDPOINTS),
                show: {
                    scavioType: ['metaAds']
                }
            },
            {
                label: 'Extract (any URL) Actions',
                name: 'extractActions',
                type: 'multiOptions',
                options: toNodeOptions(EXTRACT_ENDPOINTS),
                show: {
                    scavioType: ['extract']
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
