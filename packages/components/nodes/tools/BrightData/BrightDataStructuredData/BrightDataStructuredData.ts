import { Tool } from '@langchain/core/tools'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../../src/utils'
import axios from 'axios'

const DATASET_PATTERNS = {
    amazon_product: {
        pattern: /amazon\.com\/.*\/dp\//,
        dataset_id: 'gd_l7q7dkf244hwjntr0',
        description: 'Amazon product data extraction',
        inputs: ['url']
    },
    amazon_product_search: {
        pattern: /amazon\.com\/s\?/,
        dataset_id: 'gd_lwdb4vjm1ehb499uxs',
        description: 'Amazon search results data',
        inputs: ['keyword', 'url', 'pages_to_search'],
        defaults: { pages_to_search: '1' }
    },
    walmart_product: {
        pattern: /walmart\.com\/ip\//,
        dataset_id: 'gd_l95fol7l1ru6rlo116',
        description: 'Walmart product data extraction',
        inputs: ['url']
    },
    walmart_seller: {
        pattern: /walmart\.com\/seller\//,
        dataset_id: 'gd_m7ke48w81ocyu4hhz0',
        description: 'Walmart seller data extraction',
        inputs: ['url']
    },
    ebay_product: {
        pattern: /ebay\.com\/itm\//,
        dataset_id: 'gd_ltr9mjt81n0zzdk1fb',
        description: 'eBay product data extraction',
        inputs: ['url']
    },
    homedepot_products: {
        pattern: /homedepot\.com\/p\//,
        dataset_id: 'gd_lmusivh019i7g97q2n',
        description: 'Home Depot product data extraction',
        inputs: ['url']
    },
    zara_products: {
        pattern: /zara\.com\/.*\/.*-p\d+\.html/,
        dataset_id: 'gd_lct4vafw1tgx27d4o0',
        description: 'Zara product data extraction',
        inputs: ['url']
    },
    etsy_products: {
        pattern: /etsy\.com\/listing\//,
        dataset_id: 'gd_ltppk0jdv1jqz25mz',
        description: 'Etsy product data extraction',
        inputs: ['url']
    },
    bestbuy_products: {
        pattern: /bestbuy\.com\/site\/.*\/\d+\.p/,
        dataset_id: 'gd_ltre1jqe1jfr7cccf',
        description: 'Best Buy product data extraction',
        inputs: ['url']
    },
    linkedin_person_profile: {
        pattern: /linkedin\.com\/in\//,
        dataset_id: 'gd_l1viktl72bvl7bjuj0',
        description: 'LinkedIn person profile data',
        inputs: ['url']
    },
    linkedin_company_profile: {
        pattern: /linkedin\.com\/company\//,
        dataset_id: 'gd_l1vikfnt1wgvvqz95w',
        description: 'LinkedIn company profile data',
        inputs: ['url']
    },
    linkedin_job_listings: {
        pattern: /linkedin\.com\/jobs\//,
        dataset_id: 'gd_lpfll7v5hcqtkxl6l',
        description: 'LinkedIn job listings data',
        inputs: ['url']
    },
    linkedin_posts: {
        pattern: /linkedin\.com\/posts\/pulse\//,
        dataset_id: 'gd_lyy3tktm25m4avu764',
        description: 'LinkedIn posts data',
        inputs: ['url']
    },
    linkedin_people_search: {
        pattern: /linkedin\.com\/search\/results\/people/,
        dataset_id: 'gd_m8d03he47z8nwb5xc',
        description: 'LinkedIn people search data',
        inputs: ['url', 'first_name', 'last_name']
    },
    crunchbase_company: {
        pattern: /crunchbase\.com\/organization\//,
        dataset_id: 'gd_l1vijqt9jfj7olije',
        description: 'Crunchbase company data',
        inputs: ['url']
    },
    zoominfo_company_profile: {
        pattern: /zoominfo\.com\/c\//,
        dataset_id: 'gd_m0ci4a4ivx3j5l6nx',
        description: 'ZoomInfo company profile data',
        inputs: ['url']
    },
    instagram_profiles: {
        pattern: /instagram\.com\/[^/]+\/?$/,
        dataset_id: 'gd_l1vikfch901nx3by4',
        description: 'Instagram profile data',
        inputs: ['url']
    },
    instagram_posts: {
        pattern: /instagram\.com\/p\//,
        dataset_id: 'gd_lk5ns7kz21pck8jpis',
        description: 'Instagram post data',
        inputs: ['url']
    },
    instagram_reels: {
        pattern: /instagram\.com\/reel\//,
        dataset_id: 'gd_lyclm20il4r5helnj',
        description: 'Instagram reel data',
        inputs: ['url']
    },
    facebook_posts: {
        pattern: /facebook\.com\/.*\/posts\//,
        dataset_id: 'gd_lyclm1571iy3mv57zw',
        description: 'Facebook post data',
        inputs: ['url']
    },
    facebook_marketplace_listings: {
        pattern: /facebook\.com\/marketplace\/item\//,
        dataset_id: 'gd_lvt9iwuh6fbcwmx1a',
        description: 'Facebook marketplace listing data',
        inputs: ['url']
    },
    tiktok_profiles: {
        pattern: /tiktok\.com\/@[^/]+\/?$/,
        dataset_id: 'gd_l1villgoiiidt09ci',
        description: 'TikTok profile data',
        inputs: ['url']
    },
    tiktok_posts: {
        pattern: /tiktok\.com\/@.*\/video\//,
        dataset_id: 'gd_lu702nij2f790tmv9h',
        description: 'TikTok post data',
        inputs: ['url']
    },
    google_maps_reviews: {
        pattern: /maps\.google\.com.*\/place\//,
        dataset_id: 'gd_luzfs1dn2oa0teb81',
        description: 'Google Maps reviews data',
        inputs: ['url', 'days_limit'],
        defaults: { days_limit: '3' }
    },
    google_shopping: {
        pattern: /shopping\.google\.com\/product\//,
        dataset_id: 'gd_ltppk50q18kdw67omz',
        description: 'Google Shopping product data',
        inputs: ['url']
    },
    google_play_store: {
        pattern: /play\.google\.com\/store\/apps\/details/,
        dataset_id: 'gd_lsk382l8xei8vzm4u',
        description: 'Google Play Store app data',
        inputs: ['url']
    },
    apple_app_store: {
        pattern: /apps\.apple\.com\/.*\/app\//,
        dataset_id: 'gd_lsk9ki3u2iishmwrui',
        description: 'Apple App Store app data',
        inputs: ['url']
    },
    yahoo_finance_business: {
        pattern: /finance\.yahoo\.com\/quote\//,
        dataset_id: 'gd_lmrpz3vxmz972ghd7',
        description: 'Yahoo Finance business data',
        inputs: ['url']
    },
    x_posts: {
        pattern: /(x\.com)\/.*\/status\//,
        dataset_id: 'gd_lwxkxvnf1cynvib9co',
        description: 'X (Twitter) post data',
        inputs: ['url']
    },
    zillow_properties_listing: {
        pattern: /zillow\.com\/homedetails\//,
        dataset_id: 'gd_lfqkr8wm13ixtbd8f5',
        description: 'Zillow property listing data',
        inputs: ['url']
    },
    booking_hotel_listings: {
        pattern: /booking\.com/,
        dataset_id: 'gd_m5mbdl081229ln6t4a',
        description: 'Booking.com hotel and accommodation data',
        inputs: ['url']
    },
    youtube_profiles: {
        pattern: /youtube\.com\/(channel\/|c\/|@)/,
        dataset_id: 'gd_lk538t2k2p1k3oos71',
        description: 'YouTube profile data',
        inputs: ['url']
    },
    youtube_video_comments: {
        pattern: /youtube\.com\/watch\?v=[A-Za-z0-9_-]+/,
        dataset_id: 'gd_lk9q0ew71spt1mxywf',
        description: 'YouTube video comments data',
        inputs: ['url', 'num_of_comments'],
        defaults: { num_of_comments: '10' }
    },
    reddit_posts: {
        pattern: /reddit\.com\/(r\/[^/]+|t\/[^/]+)/,
        dataset_id: 'gd_lvz8ah06191smkebj4',
        description: 'Reddit post and topic data',
        inputs: ['url']
    }
}

class BrightDataStructuredDataTool extends Tool {
    name = 'brightdata_structured_data'
    description =
        'Extract structured data from 40+ supported websites including: Amazon (products, reviews, search), LinkedIn (profiles, companies, jobs, posts, people search), Instagram (profiles, posts, reels, comments), TikTok (profiles, posts, shop, comments), Facebook (posts, marketplace, events, company reviews), YouTube (profiles, videos, comments), Reddit posts, Google (Maps reviews, Shopping, Play Store), Apple App Store, X/Twitter posts, Walmart (products, sellers), eBay products, Best Buy products, Home Depot products, Zara products, Etsy products, Booking.com hotels, Zillow properties, Crunchbase companies, ZoomInfo companies, Yahoo Finance, Reuters news, GitHub repositories. Input must be a complete URL from any of these supported platforms.'
    constructor(
        private apiToken: string,
        private timeoutMs: number = 120000,
        private maxAttempts: number = 600,
        private configuredUrl?: string
    ) {
        super()
    }

    private getApiHeaders() {
        return {
            authorization: `Bearer ${this.apiToken}`,
            'user-agent': 'flowise-brightdata/1.0.0',
            'Content-Type': 'application/json'
        }
    }

    private detectDataset(url: string): { key: string; dataset: any } | null {
        const orderedPatterns: (keyof typeof DATASET_PATTERNS)[] = [
            'amazon_product',
            'amazon_product_search',
            'linkedin_people_search',
            'linkedin_posts',
            'linkedin_job_listings',
            'linkedin_company_profile',
            'linkedin_person_profile',
            'instagram_reels',
            'instagram_posts',
            'instagram_profiles',
            'tiktok_posts',
            'tiktok_profiles',
            'facebook_marketplace_listings',
            'facebook_posts',
            'x_posts',
            'youtube_video_comments',
            'youtube_profiles',
            'walmart_seller',
            'walmart_product',
            'ebay_product',
            'etsy_products',
            'bestbuy_products',
            'homedepot_products',
            'zara_products',
            'google_shopping',
            'google_play_store',
            'google_maps_reviews',
            'apple_app_store',
            'crunchbase_company',
            'zoominfo_company_profile',
            'yahoo_finance_business',
            'zillow_properties_listing',
            'booking_hotel_listings',
            'reddit_posts'
        ]

        for (const key of orderedPatterns) {
            // if (key.startsWith('amazon_product')) continue

            const dataset = DATASET_PATTERNS[key]
            if (dataset && dataset.pattern.test(url)) {
                return { key, dataset }
            }
        }

        return null
    }

    private extractUrlParams(url: string, dataset: any): Record<string, string> {
        const params: Record<string, string> = { url }

        if (dataset.defaults) {
            Object.assign(params, dataset.defaults)
        }

        if (dataset.key === 'amazon_product_search') {
            const urlObj = new URL(url)
            const keyword = urlObj.searchParams.get('k') || urlObj.searchParams.get('field-keywords')
            if (keyword) {
                params.keyword = keyword
            }
        }

        return params
    }

    async _call(input: string): Promise<string> {
        try {
            const urlToProcess = this.configuredUrl || input.trim()

            if (!urlToProcess) {
                const errorMsg = 'No URL provided. Please specify a URL from a supported platform.'
                return `Error: ${errorMsg}`
            }

            try {
                new URL(urlToProcess)
                if (!urlToProcess.startsWith('http')) {
                    throw new Error('Invalid protocol')
                }
            } catch (e) {
                const errorMsg = 'Invalid URL format. Please provide a valid HTTP/HTTPS URL.'
                return `Error: ${errorMsg}`
            }

            const detection = this.detectDataset(urlToProcess)
            if (!detection) {
                const supportedPlatforms = Object.keys(DATASET_PATTERNS).join(', ')
                const errorMsg = `URL not supported we are currently testing. Supported platforms: ${supportedPlatforms}`
                return `Error: ${errorMsg}`
            }

            const { key, dataset } = detection
            const requestData = this.extractUrlParams(urlToProcess, { ...dataset, key })

            const triggerResponse = await axios({
                url: 'https://api.brightdata.com/datasets/v3/trigger',
                params: { dataset_id: dataset.dataset_id, include_errors: true },
                method: 'POST',
                data: [requestData],
                headers: this.getApiHeaders(),
                timeout: this.timeoutMs
            })

            if (!triggerResponse.data?.snapshot_id) {
                throw new Error('No snapshot ID returned from request')
            }

            const snapshotId = triggerResponse.data.snapshot_id
            let attempts = 0
            while (attempts < this.maxAttempts) {
                try {
                    const snapshotResponse = await axios({
                        url: `https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}`,
                        params: { format: 'json' },
                        method: 'GET',
                        headers: this.getApiHeaders(),
                        timeout: this.timeoutMs
                    })

                    if (snapshotResponse.data?.status === 'running') {
                        attempts++
                        await new Promise((resolve) => setTimeout(resolve, 1000))
                        continue
                    }

                    const resultData = JSON.stringify(snapshotResponse.data, null, 2)
                    return `Successfully extracted structured data from ${dataset.description}:\n\n${resultData}`
                } catch (pollError: any) {
                    attempts++
                    await new Promise((resolve) => setTimeout(resolve, 1000))
                }
            }

            throw new Error(`Timeout after ${this.maxAttempts} seconds waiting for data`)
        } catch (error: any) {
            if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
                const errorMsg = `Request timeout after ${this.timeoutMs / 1000} seconds.`
                return `Error: ${errorMsg}`
            }

            if (error.response) {
                const statusCode = error.response.status
                const statusText = error.response.statusText
                const errorData = error.response.data

                const errorMsg = `HTTP Error ${statusCode}: ${statusText}. ${errorData || ''}`.trim()
                return `Error: ${errorMsg}`
            }

            const errorMsg = `Data extraction failed: ${error.message || 'Unknown error occurred'}`
            return `Error: ${errorMsg}`
        }
    }
}

class BrightDataStructuredData_Tools implements INode {
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
        this.label = 'Bright Data Structured Data'
        this.name = 'brightDataStructuredData'
        this.version = 1.0
        this.type = 'BrightDataStructuredData'
        this.icon = 'brightdata-data.svg'
        this.category = 'Tools'
        this.description =
            'Extract structured data from 40+ platforms: Amazon, LinkedIn, Instagram, TikTok, Facebook, YouTube, Reddit, Google services, Apple App Store, X/Twitter, Walmart, eBay, Best Buy, Home Depot, Zara, Etsy, Booking.com, Zillow, Crunchbase, ZoomInfo, Yahoo Finance, Reuters, GitHub with automatic platform detection'
        this.baseClasses = [this.type, ...getBaseClasses(BrightDataStructuredDataTool)]

        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['brightDataApi']
        }

        this.inputs = [
            {
                label: 'URL',
                name: 'url',
                type: 'string',
                description: 'The URL of the webpage to extract structured data from. Must be from a supported platform.',
                placeholder: 'https://www.amazon.com/dp/B08N5WRWNW',
                optional: true
            },
            {
                label: 'Timeout (seconds)',
                name: 'timeoutS',
                type: 'number',
                description: 'Maximum time in seconds to wait for data extraction. Recommended: 120-300 seconds.',
                placeholder: '120',
                default: 120,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Max Polling Attempts',
                name: 'maxAttempts',
                type: 'number',
                description: 'Maximum number of polling attempts for data collection. Default: 600.',
                placeholder: '600',
                default: 600,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Tool Description',
                name: 'description',
                type: 'string',
                description: 'Custom description of what the tool does. This helps the LLM understand when to use this tool.',
                rows: 3,
                additionalParams: true,
                optional: true,
                placeholder:
                    'Extract structured data from supported platforms using Bright Data datasets with automatic platform detection.'
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiToken = getCredentialParam('brightDataApiToken', credentialData, nodeData)

        if (!apiToken) {
            throw new Error('Bright Data API token is required but not found in credentials')
        }

        const configuredUrl = nodeData.inputs?.url as string
        const timeoutS = (nodeData.inputs?.timeoutS as number) || 120
        const maxAttempts = (nodeData.inputs?.maxAttempts as number) || 600
        const customDescription = nodeData.inputs?.description as string

        const tool = new BrightDataStructuredDataTool(apiToken, timeoutS * 1000, maxAttempts, configuredUrl)

        if (customDescription) {
            tool.description = customDescription
        }

        return tool
    }
}

module.exports = { nodeClass: BrightDataStructuredData_Tools }
