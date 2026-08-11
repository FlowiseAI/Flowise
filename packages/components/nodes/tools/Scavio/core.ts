import { z } from 'zod/v3'
import { DynamicStructuredTool } from '../OpenAPIToolkit/core'
import { TOOL_ARGS_PREFIX, formatToolError } from '../../../src/agents'
import { secureAxiosRequest } from '../../../src/httpSecurity'
import type { ICommonObject, INodeOptionsValue } from '../../../src/Interface'

export const SCAVIO_BASE_URL = 'https://api.scavio.dev'

export const desc = `Use this when you need real-time data from Google, YouTube, Amazon, Walmart, Reddit, TikTok, TikTok Shop, Instagram, X or LinkedIn through the Scavio API`

export interface ScavioEndpoint {
    /** Value used by the node multiOptions input */
    action: string
    /** Human readable label shown in the node UI */
    label: string
    /** Tool name exposed to the agent */
    name: string
    /** Public Scavio path, appended to SCAVIO_BASE_URL */
    path: string
    /** Credit cost of one successful call */
    credits: number
    /** Tool description shown to the agent */
    description: string
    // eslint-disable-next-line
    schema: z.ZodObject<any, any, any, any>
    /** Node level default keys this endpoint accepts. Anything not listed is never sent. */
    defaults?: string[]
}

export interface RequestParameters {
    platform?: string
    actions?: string[]
    apiKey?: string
    defaultParams?: ICommonObject
}

const describeCost = (path: string, credits: number) => `Scavio POST ${path}. Costs ${credits} credit${credits === 1 ? '' : 's'}.`

const endpoint = (
    action: string,
    label: string,
    name: string,
    path: string,
    credits: number,
    summary: string,
    // eslint-disable-next-line
    schema: z.ZodObject<any, any, any, any>,
    defaults?: string[]
): ScavioEndpoint => ({
    action,
    label,
    name,
    path,
    credits,
    description: `${summary} ${describeCost(path, credits)}`,
    schema,
    defaults
})

/* -------------------------------------------------------------------------- */
/* Shared field fragments                                                      */
/* -------------------------------------------------------------------------- */

const cursor = z.string().optional().describe('Opaque pagination cursor taken from next_cursor of a previous response')
const emptySchema = z.object({})

/* -------------------------------------------------------------------------- */
/* Google - 14 endpoints, 1 credit each, all on /api/v2 (v1 was retired)       */
/* -------------------------------------------------------------------------- */

const GOOGLE_LOCALE = ['gl', 'hl', 'google_domain', 'location', 'device']

export const GOOGLE_ENDPOINTS: ScavioEndpoint[] = [
    endpoint(
        'search',
        'Google Search',
        'scavio_google_search',
        '/api/v2/google',
        1,
        'Search Google and get organic_results (title, link, snippet) plus ads, related questions, related searches and the AI overview.',
        z.object({
            query: z.string().max(500).describe('The search query'),
            start: z.number().int().min(0).max(990).optional().describe('Result offset, not a page number. 0 = page 1, 10 = page 2'),
            safe: z.enum(['active']).optional().describe('Set to active to enable SafeSearch'),
            nfpr: z.boolean().optional().describe('Disable autocorrection of the query'),
            filter: z.enum(['0', '1']).optional().describe('0 disables the similar/omitted results filter'),
            time_period: z
                .enum(['last_hour', 'last_day', 'last_week', 'last_month', 'last_year'])
                .optional()
                .describe('Restrict results to a recency window'),
            resolve_ai_overview: z.boolean().optional().describe('Defaults to true. Set false to skip resolving a deferred AI overview')
        }),
        GOOGLE_LOCALE
    ),
    endpoint(
        'aiMode',
        'Google AI Mode',
        'scavio_google_ai_mode',
        '/api/v2/google/ai-mode',
        1,
        'Run a query through Google AI Mode and get the generated text_blocks plus the references it cites.',
        z.object({
            query: z.string().max(500).describe('The question to ask Google AI Mode'),
            safe: z.enum(['active']).optional().describe('Set to active to enable SafeSearch')
        }),
        GOOGLE_LOCALE
    ),
    endpoint(
        'mapsSearch',
        'Google Maps Search',
        'scavio_google_maps_search',
        '/api/v2/google/maps/search',
        1,
        'Find local businesses on Google Maps and get local_results with place_id, rating, reviews, address and phone.',
        z.object({
            query: z.string().max(500).describe('What to look for, e.g. "coffee shops in Austin"'),
            start: z.number().int().min(0).max(100).optional().describe('Result offset, must be a multiple of 20'),
            ll: z
                .string()
                .max(64)
                .optional()
                .describe('Map centre as @lat,lng,zoomz e.g. @40.7128,-74.0060,13z. Maps localises by ll, not by country')
        }),
        ['gl', 'hl', 'google_domain']
    ),
    endpoint(
        'mapsPlace',
        'Google Maps Place',
        'scavio_google_maps_place',
        '/api/v2/google/maps/place',
        1,
        'Get full Google Maps place details for one business. Provide place_id or data_cid.',
        z.object({
            place_id: z.string().max(256).optional().describe('Place id in ChIJ... form'),
            data_cid: z.string().max(64).optional().describe('Numeric CID, alternative to place_id')
        })
    ),
    endpoint(
        'mapsReviews',
        'Google Maps Reviews',
        'scavio_google_maps_reviews',
        '/api/v2/google/maps/reviews',
        1,
        'Get Google Maps reviews for a place. Provide data_id or place_id.',
        z.object({
            data_id: z.string().max(128).optional().describe('Data id in 0xHEX:0xHEX form'),
            place_id: z.string().max(256).optional().describe('Place id in ChIJ... form'),
            num: z.number().int().min(1).max(20).optional().describe('Reviews per page, max 20'),
            next_page_token: z.string().max(2048).optional().describe('Cursor from a previous response'),
            sort_by: z.enum(['relevance', 'newest', 'highest_rating', 'lowest_rating']).optional().describe('Review sort order')
        }),
        ['gl', 'hl', 'google_domain']
    ),
    endpoint(
        'shopping',
        'Google Shopping Search',
        'scavio_google_shopping',
        '/api/v2/google/shopping',
        1,
        'Search Google Shopping and get shopping_results with prices, merchants and ratings.',
        z.object({
            query: z.string().max(500).describe('Product search query'),
            start: z.number().int().min(0).optional().describe('Result offset, follow pagination.next'),
            min_price: z.number().int().min(0).optional().describe('Minimum price filter'),
            max_price: z.number().int().min(0).optional().describe('Maximum price filter'),
            sort_by: z.number().int().min(0).max(2).optional().describe('0 relevance, 1 price ascending, 2 price descending'),
            free_shipping: z.boolean().optional().describe('Only offers with free shipping'),
            on_sale: z.boolean().optional().describe('Only discounted offers'),
            shoprs: z.string().max(4096).optional().describe('Opaque filter token taken from filters[] of a previous response')
        }),
        GOOGLE_LOCALE
    ),
    endpoint(
        'shoppingProduct',
        'Google Shopping Product',
        'scavio_google_shopping_product',
        '/api/v2/google/shopping/product',
        1,
        'Get one Google Shopping product with its offers. Requires catalog_id (with query), product_id, page_token or immersive_product_page_token.',
        z.object({
            catalog_id: z.string().max(64).optional().describe('Durable catalog id. When set, query is also required'),
            query: z.string().max(500).optional().describe('Product query, mandatory whenever catalog_id is supplied'),
            product_id: z.string().max(64).optional().describe('Product id, alternative driver'),
            page_token: z.string().max(8192).optional().describe('Alias of immersive_product_page_token'),
            immersive_product_page_token: z.string().max(8192).optional().describe('Immersive product page token'),
            sort_by: z.enum(['base_price', 'total_price', 'promotion', 'seller_rating']).optional().describe('Seller sort order'),
            load_all_stores: z.boolean().optional().describe('Return every store rather than the first page'),
            more_stores: z.boolean().optional().describe('Include additional store offers')
        }),
        GOOGLE_LOCALE
    ),
    endpoint(
        'shoppingProductStores',
        'Google Shopping Product Stores',
        'scavio_google_shopping_product_stores',
        '/api/v2/google/shopping/product/stores',
        1,
        'Page through the remaining stores of a Google Shopping product. Both fields come from a previous shopping product call.',
        z.object({
            catalog_id: z.string().max(64).describe('The same catalog_id used on the shopping product call'),
            next_page_token: z.string().max(8192).describe('Continuation token from the previous response')
        })
    ),
    endpoint(
        'flights',
        'Google Flights',
        'scavio_google_flights',
        '/api/v2/google/flights',
        1,
        'Search Google Flights and get best_flights and other_flights with prices, durations and layovers.',
        z.object({
            departure_id: z.string().max(64).describe('Origin IATA code, e.g. JFK. Comma separated codes allowed'),
            arrival_id: z.string().max(64).describe('Destination IATA code, e.g. LHR'),
            outbound_date: z.string().max(10).describe('Departure date as YYYY-MM-DD'),
            return_date: z.string().max(10).optional().describe('Return date as YYYY-MM-DD, required when type is 1'),
            type: z.number().int().min(1).max(3).optional().describe('1 round trip, 2 one way, 3 multi city'),
            adults: z.number().int().min(1).max(9).optional().describe('Number of adults'),
            children: z.number().int().min(0).max(9).optional().describe('Number of children'),
            infants_in_seat: z.number().int().min(0).max(4).optional().describe('Infants in their own seat'),
            infants_on_lap: z.number().int().min(0).max(4).optional().describe('Infants on lap'),
            travel_class: z.number().int().min(1).max(4).optional().describe('1 economy, 2 premium, 3 business, 4 first'),
            stops: z.number().int().min(0).max(3).optional().describe('0 any, 1 nonstop, 2 one stop or fewer, 3 two stops or fewer'),
            sort_by: z.number().int().min(1).max(6).optional().describe('1 top, 2 price, 3 departure, 4 arrival, 5 duration, 6 emissions'),
            include_airlines: z.string().max(128).optional().describe('Airline codes to include'),
            exclude_airlines: z.string().max(128).optional().describe('Airline codes to exclude'),
            currency: z.string().length(3).optional().describe('Three letter currency code, e.g. USD')
        }),
        ['gl', 'hl']
    ),
    endpoint(
        'hotels',
        'Google Hotels',
        'scavio_google_hotels',
        '/api/v2/google/hotels',
        1,
        'Search Google Hotels and get properties with nightly rates, ratings and a detail_token for the hotel detail tool.',
        z.object({
            query: z.string().max(200).describe('Destination, best phrased as "<City> hotels"'),
            check_in_date: z.string().max(10).describe('Check in date as YYYY-MM-DD'),
            check_out_date: z.string().max(10).describe('Check out date as YYYY-MM-DD'),
            currency: z.string().length(3).optional().describe('Three letter currency code'),
            sort_by: z.number().int().optional().describe('3 lowest price, 8 highest rating, 13 most reviewed'),
            min_price: z.number().int().min(0).optional().describe('Minimum nightly price'),
            max_price: z.number().int().min(0).optional().describe('Maximum nightly price'),
            rating: z.number().int().optional().describe('7 for 3.5+, 8 for 4.0+, 9 for 4.5+'),
            hotel_class: z.string().max(16).optional().describe('Comma separated star classes 2 to 5, e.g. "4,5"'),
            amenities: z.string().max(128).optional().describe('Amenity ids'),
            property_types: z.string().max(64).optional().describe('Property type ids, 12 is vacation rentals'),
            free_cancellation: z.boolean().optional().describe('Only free cancellation rates'),
            eco_certified: z.boolean().optional().describe('Only eco certified properties'),
            special_offers: z.boolean().optional().describe('Only properties with special offers'),
            next_page_token: z.string().max(8192).optional().describe('Cursor from a previous response'),
            limit: z.number().int().min(1).max(20).optional().describe('Properties per page, max 20')
        }),
        ['gl', 'hl']
    ),
    endpoint(
        'hotelsDetail',
        'Google Hotels Detail',
        'scavio_google_hotels_detail',
        '/api/v2/google/hotels/detail',
        1,
        'Get one hotel with its booking_sources. The dates must be repeated, the token alone is not enough.',
        z.object({
            detail_token: z.string().max(8192).describe('detail_token from a property returned by the hotels tool'),
            check_in_date: z.string().max(10).describe('Check in date as YYYY-MM-DD'),
            check_out_date: z.string().max(10).describe('Check out date as YYYY-MM-DD'),
            currency: z.string().length(3).optional().describe('Three letter currency code')
        }),
        ['gl', 'hl']
    ),
    endpoint(
        'news',
        'Google News',
        'scavio_google_news',
        '/api/v2/google/news',
        1,
        'Get Google News results. Supply exactly one driver: query, topic_token, section_token, story_token, publication_token or kgmid.',
        z.object({
            query: z.string().max(500).optional().describe('News search query'),
            topic_token: z.string().max(8192).optional().describe('Topic token from a previous response'),
            section_token: z.string().max(8192).optional().describe('Section token from a previous response'),
            story_token: z.string().max(8192).optional().describe('Story token from a previous response'),
            publication_token: z.string().max(8192).optional().describe('Publication token from a previous response'),
            kgmid: z.string().max(64).optional().describe('Knowledge Graph entity id, e.g. /m/02_286'),
            so: z.number().int().min(0).max(1).optional().describe('0 relevance, 1 date. Only valid with query or kgmid')
        }),
        ['gl', 'hl', 'google_domain']
    ),
    endpoint(
        'trends',
        'Google Trends',
        'scavio_google_trends',
        '/api/v2/google/trends',
        1,
        'Get Google Trends interest over time and interest by region for a term.',
        z.object({
            query: z.string().max(500).describe('The term to chart'),
            geo: z.string().max(16).optional().describe('Uppercase region such as US, GB or US-CA. Worldwide when omitted'),
            date: z.string().max(64).optional().describe('Time range, e.g. "today 12-m" or "2024-01-01 2024-12-31"'),
            tz: z.string().max(8).optional().describe('Timezone offset in minutes, sent as a string'),
            data_type: z
                .enum(['TIMESERIES', 'GEO_MAP', 'GEO_MAP_0', 'RELATED_QUERIES', 'RELATED_TOPICS'])
                .optional()
                .describe('Which trends dataset to return, uppercase'),
            cat: z.string().max(8).optional().describe('Category id as a string, e.g. "71"'),
            gprop: z.enum(['images', 'news', 'youtube', 'froogle']).optional().describe('Property to search, empty means web'),
            region: z.enum(['COUNTRY', 'REGION', 'DMA', 'CITY']).optional().describe('Resolution of interest_by_region')
        }),
        ['hl']
    ),
    endpoint(
        'trending',
        'Google Trending Now',
        'scavio_google_trending',
        '/api/v2/google/trending',
        1,
        'Get the currently trending searches for a country. This endpoint has no query field, geo is the driver.',
        z.object({
            geo: z.string().max(16).describe('Country code such as US'),
            hours: z.number().int().optional().describe('Trend window in hours, typically 4, 24, 48 or 168'),
            cat: z.number().int().min(0).max(20).optional().describe('Category id as a number, 0 is all'),
            sort: z.enum(['relevance', 'search_volume', 'recency', 'title']).optional().describe('Sort order, the field is sort'),
            status: z.enum(['all', 'active']).optional().describe('Include ended trends or only active ones')
        }),
        ['hl']
    )
]

/* -------------------------------------------------------------------------- */
/* YouTube - 15 exposed endpoints (/youtube/metadata is a deprecated alias)    */
/* -------------------------------------------------------------------------- */

const youtubeVideoId = z.string().describe('Video id or watch URL, e.g. dQw4w9WgXcQ')
const youtubeChannelId = z.string().describe('Channel id, @handle or channel URL')

export const YOUTUBE_ENDPOINTS: ScavioEndpoint[] = [
    endpoint(
        'search',
        'YouTube Search',
        'scavio_youtube_search',
        '/api/v1/youtube/search',
        2,
        'Search YouTube videos, channels and playlists. The query field is named search.',
        z.object({
            search: z.string().max(500).describe('The search query'),
            upload_date: z.enum(['last_hour', 'today', 'this_week', 'this_month', 'this_year']).optional().describe('Recency filter'),
            type: z.enum(['video', 'channel', 'playlist', 'movie']).optional().describe('Result type filter'),
            duration: z.enum(['short', 'medium', 'long']).optional().describe('Duration filter'),
            sort_by: z.enum(['relevance', 'date', 'view_count', 'rating']).optional().describe('Sort order'),
            features: z
                .array(z.enum(['hd', '4k', 'subtitles', 'creative_commons', 'live', '360', '3d', 'hdr', 'vr180']))
                .optional()
                .describe('Feature filters'),
            cursor
        })
    ),
    endpoint(
        'shorts',
        'YouTube Shorts Search',
        'scavio_youtube_shorts',
        '/api/v1/youtube/shorts',
        2,
        'Search YouTube Shorts. The query field is named search.',
        z.object({
            search: z.string().max(500).describe('The search query'),
            sort_by: z.enum(['relevance', 'date', 'view_count', 'rating']).optional().describe('Sort order'),
            cursor
        })
    ),
    endpoint(
        'suggestions',
        'YouTube Search Suggestions',
        'scavio_youtube_suggestions',
        '/api/v1/youtube/suggestions',
        1,
        'Get YouTube autocomplete suggestions for a term.',
        z.object({
            search: z.string().max(500).describe('The partial query to autocomplete'),
            language: z.string().optional().describe('Language code, e.g. en'),
            region: z.string().optional().describe('Region code, e.g. US')
        })
    ),
    endpoint(
        'video',
        'YouTube Video Details',
        'scavio_youtube_video',
        '/api/v1/youtube/video',
        1,
        'Get full details for one YouTube video: title, channel, view count, description, keywords and captions.',
        z.object({ video_id: youtubeVideoId })
    ),
    endpoint(
        'comments',
        'YouTube Video Comments',
        'scavio_youtube_comments',
        '/api/v1/youtube/comments',
        1,
        'Get top level comments for a YouTube video. Each comment carries a reply_cursor for the replies tool.',
        z.object({ video_id: youtubeVideoId, cursor })
    ),
    endpoint(
        'commentReplies',
        'YouTube Comment Replies',
        'scavio_youtube_comment_replies',
        '/api/v1/youtube/comments/replies',
        1,
        'Get the replies to one YouTube comment. Needs the reply_cursor from the comments tool.',
        z.object({
            video_id: youtubeVideoId,
            reply_cursor: z.string().describe('reply_cursor taken from a comment returned by the comments tool'),
            cursor
        })
    ),
    endpoint(
        'transcript',
        'YouTube Transcript',
        'scavio_youtube_transcript',
        '/api/v1/youtube/transcript',
        8,
        'Get the transcript of a YouTube video as plain text or timed SRT.',
        z.object({
            video_id: youtubeVideoId,
            language: z.string().optional().describe('Caption language code, defaults to en'),
            format: z.enum(['text', 'srt']).optional().describe('text for plain text, srt for timed captions')
        })
    ),
    endpoint(
        'related',
        'YouTube Related Videos',
        'scavio_youtube_related',
        '/api/v1/youtube/related',
        1,
        'Get videos related to a given YouTube video.',
        z.object({ video_id: youtubeVideoId, cursor })
    ),
    endpoint(
        'channelSearch',
        'YouTube Channel Search',
        'scavio_youtube_channel_search',
        '/api/v1/youtube/channel/search',
        1,
        'Search for YouTube channels. The query field is named search.',
        z.object({ search: z.string().max(500).describe('The channel name to search for'), cursor })
    ),
    endpoint(
        'channel',
        'YouTube Channel Details',
        'scavio_youtube_channel',
        '/api/v1/youtube/channel',
        1,
        'Get a YouTube channel profile: subscriber count, video count, country, links and avatar.',
        z.object({ channel_id: youtubeChannelId })
    ),
    endpoint(
        'channelVideos',
        'YouTube Channel Videos',
        'scavio_youtube_channel_videos',
        '/api/v1/youtube/channel/videos',
        1,
        'List the videos uploaded by a YouTube channel.',
        z.object({ channel_id: youtubeChannelId, cursor })
    ),
    endpoint(
        'channelShorts',
        'YouTube Channel Shorts',
        'scavio_youtube_channel_shorts',
        '/api/v1/youtube/channel/shorts',
        1,
        'List the Shorts published by a YouTube channel.',
        z.object({ channel_id: youtubeChannelId, cursor })
    ),
    endpoint(
        'channelCommunity',
        'YouTube Channel Community',
        'scavio_youtube_channel_community',
        '/api/v1/youtube/channel/community',
        1,
        'List the community posts of a YouTube channel.',
        z.object({ channel_id: youtubeChannelId, cursor })
    ),
    endpoint(
        'channelResolve',
        'YouTube Channel Resolve',
        'scavio_youtube_channel_resolve',
        '/api/v1/youtube/channel/resolve',
        1,
        'Resolve a YouTube @handle or channel URL to its UC channel id. The field is named channel, not channel_id.',
        z.object({ channel: z.string().describe('A channel @handle or URL, e.g. @MrBeast') })
    ),
    endpoint(
        'streams',
        'YouTube Video Streams',
        'scavio_youtube_streams',
        '/api/v1/youtube/streams',
        3,
        'Get time limited playable stream URLs for a YouTube video.',
        z.object({ video_id: youtubeVideoId })
    )
]

/* -------------------------------------------------------------------------- */
/* Amazon - 3 billable endpoints, 1 credit each                                */
/* -------------------------------------------------------------------------- */

export const AMAZON_ENDPOINTS: ScavioEndpoint[] = [
    endpoint(
        'search',
        'Amazon Product Search',
        'scavio_amazon_search',
        '/api/v1/amazon/search',
        1,
        'Search an Amazon marketplace and get products with asin, title, price, rating and badge.',
        z.object({
            query: z.string().max(500).describe('Search keyword'),
            page: z.number().int().min(1).optional().describe('1 based results page')
        }),
        ['country']
    ),
    endpoint(
        'product',
        'Amazon Product Details',
        'scavio_amazon_product',
        '/api/v1/amazon/product',
        1,
        'Get one Amazon product by ASIN: price, features, images, variants, specifications and rank.',
        z.object({ asin: z.string().describe('The ASIN, e.g. B09V3KXJPB') }),
        ['country']
    ),
    endpoint(
        'offers',
        'Amazon Offer Listing',
        'scavio_amazon_offers',
        '/api/v1/amazon/offers',
        1,
        'Get every seller offer for an ASIN, including which one holds the buy box.',
        z.object({ asin: z.string().describe('The ASIN, e.g. B09V3KXJPB') }),
        ['country']
    )
]

/* -------------------------------------------------------------------------- */
/* Walmart - 2 endpoints, 1 credit each                                        */
/* -------------------------------------------------------------------------- */

export const WALMART_ENDPOINTS: ScavioEndpoint[] = [
    endpoint(
        'search',
        'Walmart Product Search',
        'scavio_walmart_search',
        '/api/v1/walmart/search',
        1,
        'Search Walmart products.',
        z.object({
            query: z.string().max(500).describe('Search query'),
            domain: z.string().optional().describe('Walmart domain'),
            device: z.enum(['desktop', 'mobile', 'tablet']).optional().describe('Device profile'),
            sort_by: z.enum(['best_match', 'price_low', 'price_high', 'best_seller']).optional().describe('Sort order'),
            start_page: z.number().int().min(1).optional().describe('1 based page. Walmart has no page param, only start_page'),
            min_price: z.number().int().optional().describe('Minimum price filter'),
            max_price: z.number().int().optional().describe('Maximum price filter'),
            fulfillment_speed: z.enum(['today', 'tomorrow', '2_days', 'anytime']).optional().describe('Delivery speed filter'),
            fulfillment_type: z.enum(['in_store']).optional().describe('Only in_store is supported'),
            delivery_zip: z.string().optional().describe('ZIP code used for delivery estimates'),
            store_id: z.string().optional().describe('Walmart store id')
        })
    ),
    endpoint(
        'product',
        'Walmart Product Details',
        'scavio_walmart_product',
        '/api/v1/walmart/product',
        1,
        'Get one Walmart product. The identifier field is product_id.',
        z.object({
            product_id: z.string().describe('Walmart product id'),
            domain: z.string().optional().describe('Walmart domain'),
            device: z.enum(['desktop', 'mobile', 'tablet']).optional().describe('Device profile'),
            delivery_zip: z.string().optional().describe('ZIP code used for delivery estimates'),
            store_id: z.string().optional().describe('Walmart store id')
        })
    )
]

/* -------------------------------------------------------------------------- */
/* Reddit - 12 endpoints, 1 credit each                                        */
/* -------------------------------------------------------------------------- */

const redditSort = z.enum(['HOT', 'NEW', 'TOP', 'BEST', 'CONTROVERSIAL'])

export const REDDIT_ENDPOINTS: ScavioEndpoint[] = [
    endpoint(
        'search',
        'Reddit Search',
        'scavio_reddit_search',
        '/api/v1/reddit/search',
        1,
        'Search Reddit posts. Returns results[] with next_cursor and has_more. This endpoint takes no sort or type filter.',
        z.object({ query: z.string().max(500).describe('The search query'), cursor })
    ),
    endpoint(
        'searchSuggestions',
        'Reddit Search Suggestions',
        'scavio_reddit_search_suggestions',
        '/api/v1/reddit/search/suggestions',
        1,
        'Get Reddit search autocomplete suggestions.',
        z.object({ query: z.string().max(500).describe('The partial query to autocomplete') })
    ),
    endpoint(
        'post',
        'Reddit Post',
        'scavio_reddit_post',
        '/api/v1/reddit/post',
        1,
        'Get one Reddit post as a flat object. It does not include comments, use the post comments tool for those.',
        z.object({
            post_id: z.string().optional().describe('Fullname t3_... or a bare base36 id'),
            url: z.string().optional().describe('Full Reddit post URL, alternative to post_id')
        })
    ),
    endpoint(
        'postComments',
        'Reddit Post Comments',
        'scavio_reddit_post_comments',
        '/api/v1/reddit/post/comments',
        1,
        'Get the comments of a Reddit post. Each comment carries a reply_cursor for the replies tool.',
        z.object({
            post_id: z.string().describe('Fullname t3_..., a bare id, or a post URL'),
            sort: redditSort.optional().describe('Comment sort, defaults to TOP'),
            cursor
        })
    ),
    endpoint(
        'postCommentReplies',
        'Reddit Comment Replies',
        'scavio_reddit_post_comment_replies',
        '/api/v1/reddit/post/comments/replies',
        1,
        'Get the replies under one Reddit comment. cursor is required here and must be a reply_cursor.',
        z.object({
            post_id: z.string().describe('Fullname t3_... or a bare id'),
            cursor: z.string().describe('A reply_cursor from a comment returned by the post comments tool'),
            sort: redditSort.optional().describe('Reply sort, defaults to TOP')
        })
    ),
    endpoint(
        'subreddit',
        'Reddit Subreddit',
        'scavio_reddit_subreddit',
        '/api/v1/reddit/subreddit',
        1,
        'Get a subreddit profile: subscribers, description, icon and banner.',
        z.object({ subreddit: z.string().max(100).describe('Bare subreddit name, no r/ prefix') })
    ),
    endpoint(
        'subredditPosts',
        'Reddit Subreddit Posts',
        'scavio_reddit_subreddit_posts',
        '/api/v1/reddit/subreddit/posts',
        1,
        'Get a subreddit feed. Returns posts[] with next_cursor and has_more.',
        z.object({
            subreddit: z.string().max(100).describe('Bare subreddit name, no r/ prefix'),
            sort: z
                .enum(['BEST', 'HOT', 'NEW', 'TOP', 'CONTROVERSIAL', 'RISING'])
                .optional()
                .describe('Feed sort, defaults to HOT. This is the only endpoint that accepts RISING'),
            cursor
        })
    ),
    endpoint(
        'user',
        'Reddit User',
        'scavio_reddit_user',
        '/api/v1/reddit/user',
        1,
        'Get a Reddit user profile: karma breakdown, account type and avatar.',
        z.object({ username: z.string().max(100).describe('Bare handle, no u/ prefix') })
    ),
    endpoint(
        'userPosts',
        'Reddit User Posts',
        'scavio_reddit_user_posts',
        '/api/v1/reddit/user/posts',
        1,
        'Get the posts submitted by a Reddit user. Returns posts[] with next_cursor and has_more.',
        z.object({
            username: z.string().max(100).describe('Bare handle, no u/ prefix'),
            sort: redditSort.optional().describe('Sort, defaults to NEW'),
            cursor
        })
    ),
    endpoint(
        'userComments',
        'Reddit User Comments',
        'scavio_reddit_user_comments',
        '/api/v1/reddit/user/comments',
        1,
        'Get the comments written by a Reddit user.',
        z.object({
            username: z.string().max(100).describe('Bare handle, no u/ prefix'),
            sort: redditSort.optional().describe('Sort, defaults to NEW'),
            cursor
        })
    ),
    endpoint(
        'popular',
        'Reddit Popular',
        'scavio_reddit_popular',
        '/api/v1/reddit/popular',
        1,
        'Get the Reddit popular feed.',
        z.object({ cursor })
    ),
    endpoint(
        'trending',
        'Reddit Trending',
        'scavio_reddit_trending',
        '/api/v1/reddit/trending',
        1,
        'Get the currently trending Reddit searches. Takes no parameters.',
        emptySchema
    )
]

/* -------------------------------------------------------------------------- */
/* TikTok - 11 endpoints, 1 credit each                                        */
/* -------------------------------------------------------------------------- */

const tiktokCursor = z.string().optional().describe('Pagination cursor as a STRING, e.g. "0". Sending a number is rejected')
const tiktokSecUserId = z.string().describe('sec_user_id of the account, obtained from the TikTok profile tool')

export const TIKTOK_ENDPOINTS: ScavioEndpoint[] = [
    endpoint(
        'profile',
        'TikTok User Profile',
        'scavio_tiktok_profile',
        '/api/v1/tiktok/profile',
        1,
        'Get a TikTok profile. Call this first to obtain the sec_user_id the other user tools require.',
        z.object({
            username: z.string().optional().describe('TikTok handle without the @'),
            sec_user_id: z.string().optional().describe('sec_user_id, takes precedence over username')
        })
    ),
    endpoint(
        'userPosts',
        'TikTok User Posts',
        'scavio_tiktok_user_posts',
        '/api/v1/tiktok/user/posts',
        1,
        'List a TikTok account videos. Only sec_user_id is accepted here, not a username.',
        z.object({
            sec_user_id: tiktokSecUserId,
            cursor: tiktokCursor,
            count: z.number().int().min(1).max(30).optional().describe('Videos per page, defaults to 20'),
            sort_type: z.enum(['0', '1']).optional().describe('"0" latest, "1" popular')
        })
    ),
    endpoint(
        'video',
        'TikTok Video Detail',
        'scavio_tiktok_video',
        '/api/v1/tiktok/video',
        1,
        'Get one TikTok video with its stats, author and media.',
        z.object({ video_id: z.string().describe('TikTok video id') })
    ),
    endpoint(
        'videoComments',
        'TikTok Video Comments',
        'scavio_tiktok_video_comments',
        '/api/v1/tiktok/video/comments',
        1,
        'Get the comments on a TikTok video.',
        z.object({
            video_id: z.string().describe('TikTok video id'),
            cursor: tiktokCursor,
            count: z.number().int().min(1).max(50).optional().describe('Comments per page, defaults to 20')
        })
    ),
    endpoint(
        'videoCommentReplies',
        'TikTok Comment Replies',
        'scavio_tiktok_video_comment_replies',
        '/api/v1/tiktok/video/comments/replies',
        1,
        'Get the replies to one TikTok comment.',
        z.object({
            video_id: z.string().describe('TikTok video id'),
            comment_id: z.string().describe('Id of the comment to expand'),
            cursor: tiktokCursor,
            count: z.number().int().min(1).max(50).optional().describe('Replies per page, defaults to 20')
        })
    ),
    endpoint(
        'searchVideos',
        'TikTok Search Videos',
        'scavio_tiktok_search_videos',
        '/api/v1/tiktok/search/videos',
        1,
        'Search TikTok videos. The query field is named keyword.',
        z.object({
            keyword: z.string().max(500).describe('The search keyword'),
            cursor: tiktokCursor,
            count: z.number().int().min(1).max(30).optional().describe('Videos per page, defaults to 20'),
            sort_type: z.enum(['0', '1']).optional().describe('"0" relevance, "1" most likes'),
            publish_time: z
                .enum(['0', '1', '7', '30', '90', '180'])
                .optional()
                .describe('"0" all time, "1" day, "7" week, "30" month, "90" 3 months, "180" 6 months')
        })
    ),
    endpoint(
        'searchUsers',
        'TikTok Search Users',
        'scavio_tiktok_search_users',
        '/api/v1/tiktok/search/users',
        1,
        'Search TikTok accounts. The query field is named keyword.',
        z.object({
            keyword: z.string().max(500).describe('The search keyword'),
            cursor: tiktokCursor,
            count: z.number().int().min(1).max(30).optional().describe('Users per page, defaults to 20')
        })
    ),
    endpoint(
        'hashtag',
        'TikTok Hashtag Info',
        'scavio_tiktok_hashtag',
        '/api/v1/tiktok/hashtag',
        1,
        'Get a TikTok hashtag with its id and view count. Call this to obtain the hashtag_id the hashtag videos tool needs.',
        z.object({
            hashtag_name: z.string().optional().describe('Hashtag without the leading #'),
            hashtag_id: z.string().optional().describe('Hashtag id, takes precedence over hashtag_name')
        })
    ),
    endpoint(
        'hashtagVideos',
        'TikTok Hashtag Videos',
        'scavio_tiktok_hashtag_videos',
        '/api/v1/tiktok/hashtag/videos',
        1,
        'List the videos under a TikTok hashtag. Only hashtag_id is accepted, get it from the hashtag tool.',
        z.object({
            hashtag_id: z.string().describe('Hashtag id from the TikTok hashtag tool'),
            cursor: tiktokCursor,
            count: z.number().int().min(1).max(30).optional().describe('Videos per page, defaults to 20')
        })
    ),
    endpoint(
        'userFollowers',
        'TikTok User Followers',
        'scavio_tiktok_user_followers',
        '/api/v1/tiktok/user/followers',
        1,
        'List the followers of a TikTok account. Pages with page_token and min_time, there is no cursor here.',
        z.object({
            sec_user_id: tiktokSecUserId,
            count: z.number().int().min(1).max(20).optional().describe('Users per page, max and default 20'),
            page_token: z.string().optional().describe('next_page_token from a previous response'),
            min_time: z.number().optional().describe('min_time from a previous response, a NUMBER not a string')
        })
    ),
    endpoint(
        'userFollowings',
        'TikTok User Followings',
        'scavio_tiktok_user_followings',
        '/api/v1/tiktok/user/followings',
        1,
        'List the accounts a TikTok user follows. Pages with page_token and min_time.',
        z.object({
            sec_user_id: tiktokSecUserId,
            count: z.number().int().min(1).max(20).optional().describe('Users per page, max and default 20'),
            page_token: z.string().optional().describe('next_page_token from a previous response'),
            min_time: z.number().optional().describe('min_time from a previous response, a NUMBER not a string')
        })
    )
]

/* -------------------------------------------------------------------------- */
/* TikTok Shop - 8 endpoints, 1 credit each                                    */
/* -------------------------------------------------------------------------- */

const shopRegionFull = z.enum(['US', 'GB', 'SG', 'MY', 'PH', 'TH', 'VN', 'ID']).optional().describe('Marketplace region, defaults to US')

export const TIKTOK_SHOP_ENDPOINTS: ScavioEndpoint[] = [
    endpoint(
        'search',
        'TikTok Shop Search',
        'scavio_tiktok_shop_search',
        '/api/v1/tiktok-shop/search',
        1,
        'Search the TikTok Shop US catalog. The query field is named search and there is no region param here.',
        z.object({ search: z.string().max(200).describe('The product keyword'), cursor })
    ),
    endpoint(
        'searchSuggestions',
        'TikTok Shop Search Suggestions',
        'scavio_tiktok_shop_search_suggestions',
        '/api/v1/tiktok-shop/search/suggestions',
        1,
        'Get TikTok Shop search autocomplete suggestions. The query field is named search.',
        z.object({ search: z.string().max(100).describe('The partial keyword'), region: shopRegionFull })
    ),
    endpoint(
        'product',
        'TikTok Shop Product',
        'scavio_tiktok_shop_product',
        '/api/v1/tiktok-shop/product',
        1,
        'Get one TikTok Shop product with variants, shipping and shop profile. Prices are masked upstream and come back null, use search or shop products for exact prices.',
        z.object({ product_id: z.string().describe('Numeric product id'), region: shopRegionFull })
    ),
    endpoint(
        'productReviews',
        'TikTok Shop Product Reviews',
        'scavio_tiktok_shop_product_reviews',
        '/api/v1/tiktok-shop/product/reviews',
        1,
        'Get reviews for a TikTok Shop product. This endpoint pages with page, not a cursor.',
        z.object({
            product_id: z.string().describe('Numeric product id'),
            page: z.number().int().min(1).max(500).optional().describe('1 based page, defaults to 1'),
            page_size: z.number().int().min(1).max(200).optional().describe('Reviews per page, defaults to 20'),
            sort: z.enum(['relevant', 'recent']).optional().describe('Sort order, defaults to relevant'),
            rating: z.number().int().min(1).max(5).optional().describe('Only reviews with this star rating'),
            has_media: z.boolean().optional().describe('Only reviews with a photo or video. Wins over verified_only'),
            verified_only: z.boolean().optional().describe('Only verified purchases'),
            region: shopRegionFull
        })
    ),
    endpoint(
        'categories',
        'TikTok Shop Categories',
        'scavio_tiktok_shop_categories',
        '/api/v1/tiktok-shop/categories',
        1,
        'Get the TikTok Shop category tree. Takes no parameters. Category ids are the same in every region.',
        emptySchema
    ),
    endpoint(
        'categoryProducts',
        'TikTok Shop Category Products',
        'scavio_tiktok_shop_category_products',
        '/api/v1/tiktok-shop/category/products',
        1,
        'List the products in a TikTok Shop category. Page size varies, always follow next_cursor.',
        z.object({
            category_id: z.string().describe('Category id from the categories tool, level 1 or 2'),
            cursor,
            region: z.enum(['US', 'GB']).optional().describe('Only US and GB are listed, defaults to US')
        })
    ),
    endpoint(
        'shopProducts',
        'TikTok Shop Shop Products',
        'scavio_tiktok_shop_shop_products',
        '/api/v1/tiktok-shop/shop/products',
        1,
        'List the products of one TikTok Shop seller. Prices here are exact.',
        z.object({ shop_id: z.string().describe('TikTok Shop seller id'), cursor, region: shopRegionFull })
    ),
    endpoint(
        'resolve',
        'TikTok Shop URL Resolver',
        'scavio_tiktok_shop_resolve',
        '/api/v1/tiktok-shop/resolve',
        1,
        'Resolve a TikTok Shop or vt.tiktok.com share link to a product_id or shop_id.',
        z.object({ url: z.string().max(2000).describe('A TikTok Shop product, store or share URL') })
    )
]

/* -------------------------------------------------------------------------- */
/* Instagram - 12 endpoints, per endpoint credits (10 default, 8 and 2)        */
/* -------------------------------------------------------------------------- */

const igUsername = z.string().optional().describe('Instagram handle without the @')
const igUserId = z.string().optional().describe('Numeric user id as a STRING. Takes precedence over username')
const igFeedCount = z.number().int().min(1).max(50).optional().describe('Items per page, defaults to 12')
const igFollowCount = z.number().int().min(1).max(100).optional().describe('Users per page, defaults to 12')

export const INSTAGRAM_ENDPOINTS: ScavioEndpoint[] = [
    endpoint(
        'profile',
        'Instagram User Profile',
        'scavio_instagram_profile',
        '/api/v1/instagram/profile',
        10,
        'Get an Instagram profile: follower and following counts, biography, verification and profile picture.',
        z.object({ username: igUsername, user_id: igUserId })
    ),
    endpoint(
        'userPosts',
        'Instagram User Posts',
        'scavio_instagram_user_posts',
        '/api/v1/instagram/user/posts',
        2,
        'List the timeline posts of an Instagram account. This is the cheapest Instagram endpoint.',
        z.object({ username: igUsername, user_id: igUserId, count: igFeedCount, cursor })
    ),
    endpoint(
        'userReels',
        'Instagram User Reels',
        'scavio_instagram_user_reels',
        '/api/v1/instagram/user/reels',
        10,
        'List the reels of an Instagram account.',
        z.object({ username: igUsername, user_id: igUserId, count: igFeedCount, cursor })
    ),
    endpoint(
        'userTagged',
        'Instagram User Tagged Posts',
        'scavio_instagram_user_tagged',
        '/api/v1/instagram/user/tagged',
        10,
        'List the posts an Instagram account is tagged in.',
        z.object({ username: igUsername, user_id: igUserId, count: igFeedCount, cursor })
    ),
    endpoint(
        'userStories',
        'Instagram User Stories',
        'scavio_instagram_user_stories',
        '/api/v1/instagram/user/stories',
        10,
        'Get the currently active stories of an Instagram account. Not paginated.',
        z.object({ username: igUsername, user_id: igUserId })
    ),
    endpoint(
        'post',
        'Instagram Post Detail',
        'scavio_instagram_post',
        '/api/v1/instagram/post',
        8,
        'Get one Instagram post. The post is at items[0]; video URLs live in video_versions[].url and covers in image_versions2.candidates.',
        z.object({
            url: z.string().optional().describe('Full post URL, e.g. https://www.instagram.com/p/DUajw4YkorV/'),
            media_id: z.string().optional().describe('Numeric media id, highest precedence'),
            shortcode: z.string().optional().describe('Post shortcode, e.g. DUajw4YkorV')
        })
    ),
    endpoint(
        'postComments',
        'Instagram Post Comments',
        'scavio_instagram_post_comments',
        '/api/v1/instagram/post/comments',
        10,
        'Get the comments on an Instagram post. Identified by shortcode or url, media_id is not accepted here.',
        z.object({
            shortcode: z.string().optional().describe('Post shortcode, e.g. DUajw4YkorV'),
            url: z.string().optional().describe('Full post URL, parsed down to the shortcode'),
            cursor,
            sort_order: z.enum(['popular', 'newest']).optional().describe('Comment order, popular by default')
        })
    ),
    endpoint(
        'postCommentReplies',
        'Instagram Comment Replies',
        'scavio_instagram_post_comment_replies',
        '/api/v1/instagram/post/comments/replies',
        8,
        'Get the replies to one Instagram comment. Needs media_id, which you resolve with the Instagram post tool.',
        z.object({
            media_id: z.string().describe('Numeric media id of the post'),
            comment_id: z.string().describe('Id of the comment to expand'),
            cursor
        })
    ),
    endpoint(
        'searchUsers',
        'Instagram Search Users',
        'scavio_instagram_search_users',
        '/api/v1/instagram/search/users',
        10,
        'Search Instagram accounts. The query field is named keyword and page size is not controllable.',
        z.object({ keyword: z.string().max(500).describe('The search keyword'), cursor })
    ),
    endpoint(
        'searchHashtags',
        'Instagram Search Hashtags',
        'scavio_instagram_search_hashtags',
        '/api/v1/instagram/search/hashtags',
        10,
        'Search Instagram hashtags. The query field is named keyword.',
        z.object({ keyword: z.string().max(500).describe('The search keyword'), cursor })
    ),
    endpoint(
        'userFollowers',
        'Instagram User Followers',
        'scavio_instagram_user_followers',
        '/api/v1/instagram/user/followers',
        10,
        'List the followers of an Instagram account.',
        z.object({ username: igUsername, user_id: igUserId, count: igFollowCount, cursor })
    ),
    endpoint(
        'userFollowings',
        'Instagram User Followings',
        'scavio_instagram_user_followings',
        '/api/v1/instagram/user/followings',
        10,
        'List the accounts an Instagram user follows.',
        z.object({ username: igUsername, user_id: igUserId, count: igFollowCount, cursor })
    )
]

/* -------------------------------------------------------------------------- */
/* X (Twitter) - 11 endpoints, 1 credit each                                   */
/* -------------------------------------------------------------------------- */

const xScreenName = z.string().describe('Handle without the @, e.g. elonmusk')
const xTweetId = z.string().describe('Numeric tweet id as a string')

export const X_ENDPOINTS: ScavioEndpoint[] = [
    endpoint(
        'search',
        'X Search',
        'scavio_x_search',
        '/api/v1/x/search',
        1,
        'Search posts on X. The query field is named search.',
        z.object({
            search: z.string().max(500).describe('The search query'),
            search_type: z
                .enum(['Top', 'Latest', 'People', 'Photos', 'Videos'])
                .optional()
                .describe('Capitalised timeline tab, defaults to Top'),
            cursor
        })
    ),
    endpoint(
        'tweet',
        'X Post Detail',
        'scavio_x_tweet',
        '/api/v1/x/tweet',
        1,
        'Get one post on X with its engagement counts, author and media.',
        z.object({ tweet_id: xTweetId })
    ),
    endpoint(
        'tweetComments',
        'X Post Comments',
        'scavio_x_tweet_comments',
        '/api/v1/x/tweet/comments',
        1,
        'Get the replies to a post on X.',
        z.object({
            tweet_id: xTweetId,
            rank: z.enum(['top', 'latest']).optional().describe('Lowercase. top is ranked, latest is chronological'),
            cursor
        })
    ),
    endpoint(
        'tweetRetweeters',
        'X Post Retweeters',
        'scavio_x_tweet_retweeters',
        '/api/v1/x/tweet/retweeters',
        1,
        'List the accounts that reposted a post on X.',
        z.object({ tweet_id: xTweetId, cursor })
    ),
    endpoint(
        'user',
        'X User Profile',
        'scavio_x_user',
        '/api/v1/x/user',
        1,
        'Get an X profile: followers, bio, location, website and verification.',
        z.object({ screen_name: xScreenName })
    ),
    endpoint(
        'userTweets',
        'X User Posts',
        'scavio_x_user_tweets',
        '/api/v1/x/user/tweets',
        1,
        'Get the posts of an X account, including the pinned post.',
        z.object({ screen_name: xScreenName, cursor })
    ),
    endpoint(
        'userReplies',
        'X User Replies',
        'scavio_x_user_replies',
        '/api/v1/x/user/replies',
        1,
        'Get the replies written by an X account.',
        z.object({ screen_name: xScreenName, cursor })
    ),
    endpoint(
        'userMedia',
        'X User Media',
        'scavio_x_user_media',
        '/api/v1/x/user/media',
        1,
        'Get the posts of an X account that contain media.',
        z.object({ screen_name: xScreenName, cursor })
    ),
    endpoint(
        'userFollowers',
        'X User Followers',
        'scavio_x_user_followers',
        '/api/v1/x/user/followers',
        1,
        'List the followers of an X account.',
        z.object({ screen_name: xScreenName, cursor })
    ),
    endpoint(
        'userFollowings',
        'X User Followings',
        'scavio_x_user_followings',
        '/api/v1/x/user/followings',
        1,
        'List the accounts an X user follows. The response array is named following.',
        z.object({ screen_name: xScreenName, cursor })
    ),
    endpoint(
        'trending',
        'X Trending',
        'scavio_x_trending',
        '/api/v1/x/trending',
        1,
        'Get the trending topics on X for a country.',
        z.object({
            country: z.string().optional().describe('Country NAME, not an ISO code, e.g. UnitedStates. Defaults to UnitedStates')
        })
    )
]

/* -------------------------------------------------------------------------- */
/* LinkedIn - 9 live endpoints, 1 / 10 / 30 credits                            */
/* The 5 retired paths (person/contact, company/people, company/jobs,          */
/* search/people, search/posts) return 410 and are deliberately not exposed.   */
/* -------------------------------------------------------------------------- */

export const LINKEDIN_ENDPOINTS: ScavioEndpoint[] = [
    endpoint(
        'person',
        'LinkedIn Person',
        'scavio_linkedin_person',
        '/api/v1/linkedin/person',
        1,
        'Get a LinkedIn profile: headline, about, experiences, educations and follower count.',
        z.object({
            username: z.string().optional().describe('Public identifier / vanity handle, e.g. williamhgates'),
            url: z.string().optional().describe('Full LinkedIn profile URL, alternative to username')
        })
    ),
    endpoint(
        'personAbout',
        'LinkedIn Person About',
        'scavio_linkedin_person_about',
        '/api/v1/linkedin/person/about',
        1,
        'Get only the about, experience and education sections of a LinkedIn profile.',
        z.object({
            username: z.string().optional().describe('Public identifier / vanity handle'),
            url: z.string().optional().describe('Full LinkedIn profile URL, alternative to username')
        })
    ),
    endpoint(
        'personPosts',
        'LinkedIn Person Posts',
        'scavio_linkedin_person_posts',
        '/api/v1/linkedin/person/posts',
        10,
        'Get the LinkedIn feed of a person: their posts, or the posts they commented on or reacted to.',
        z.object({
            username: z.string().optional().describe('Public identifier / vanity handle'),
            url: z.string().optional().describe('Full LinkedIn profile URL, alternative to username'),
            type: z.enum(['posts', 'comments', 'reactions']).optional().describe('Feed type, defaults to posts'),
            cursor
        })
    ),
    endpoint(
        'company',
        'LinkedIn Company',
        'scavio_linkedin_company',
        '/api/v1/linkedin/company',
        1,
        'Get a LinkedIn company page. featured_employees is a 4 to 6 person sample and is the supported substitute for the retired employee directory.',
        z.object({
            company: z.string().optional().describe('Company universal name / slug, e.g. microsoft'),
            url: z.string().optional().describe('Full LinkedIn company URL, alternative to company')
        })
    ),
    endpoint(
        'companyPosts',
        'LinkedIn Company Posts',
        'scavio_linkedin_company_posts',
        '/api/v1/linkedin/company/posts',
        10,
        'Get the posts published by a LinkedIn company page.',
        z.object({
            company: z.string().optional().describe('Company universal name / slug'),
            url: z.string().optional().describe('Full LinkedIn company URL, alternative to company'),
            cursor
        })
    ),
    endpoint(
        'searchJobs',
        'LinkedIn Job Search',
        'scavio_linkedin_search_jobs',
        '/api/v1/linkedin/search/jobs',
        10,
        'Search LinkedIn job listings. The query field is named search. Results rotate between calls, so dedupe by job id.',
        z.object({
            search: z.string().describe('Job keywords, e.g. software engineer'),
            location: z.string().optional().describe('Geographic filter, omit to search everywhere'),
            cursor
        })
    ),
    endpoint(
        'job',
        'LinkedIn Job Detail',
        'scavio_linkedin_job',
        '/api/v1/linkedin/job',
        30,
        'Get one LinkedIn job listing in full. This is the most expensive Scavio endpoint. Expired listings answer 404 and are not billed.',
        z.object({
            job_id: z.string().optional().describe('Numeric job id, e.g. 4415427228'),
            url: z.string().optional().describe('Full LinkedIn job URL, alternative to job_id')
        })
    ),
    endpoint(
        'post',
        'LinkedIn Post',
        'scavio_linkedin_post',
        '/api/v1/linkedin/post',
        1,
        'Get one LinkedIn post with its author, media, hashtags and top comments.',
        z.object({
            post_id: z.string().optional().describe('Post id or an activity/ugcPost/share urn'),
            url: z.string().optional().describe('Full LinkedIn post URL, alternative to post_id')
        })
    ),
    endpoint(
        'postComments',
        'LinkedIn Post Comments',
        'scavio_linkedin_post_comments',
        '/api/v1/linkedin/post/comments',
        10,
        'Get the comments on a LinkedIn post. This is the only LinkedIn endpoint paginated by page rather than a cursor.',
        z.object({
            post_id: z.string().optional().describe('Post id or an activity urn'),
            url: z.string().optional().describe('Full LinkedIn post URL, alternative to post_id'),
            page: z.number().int().positive().optional().describe('1 based page, defaults to 1')
        })
    )
]

/* -------------------------------------------------------------------------- */
/* Platform registry                                                           */
/* -------------------------------------------------------------------------- */

export const SCAVIO_ENDPOINTS: Record<string, ScavioEndpoint[]> = {
    google: GOOGLE_ENDPOINTS,
    youtube: YOUTUBE_ENDPOINTS,
    amazon: AMAZON_ENDPOINTS,
    walmart: WALMART_ENDPOINTS,
    reddit: REDDIT_ENDPOINTS,
    tiktok: TIKTOK_ENDPOINTS,
    tiktokShop: TIKTOK_SHOP_ENDPOINTS,
    instagram: INSTAGRAM_ENDPOINTS,
    x: X_ENDPOINTS,
    linkedin: LINKEDIN_ENDPOINTS
}

/** Build the multiOptions list for a platform straight from the endpoint table, so the UI can never drift from the API. */
export const toNodeOptions = (endpoints: ScavioEndpoint[]): INodeOptionsValue[] =>
    endpoints.map((e) => ({
        label: e.label,
        name: e.action,
        description: describeCost(e.path, e.credits)
    }))

/* -------------------------------------------------------------------------- */
/* Tool                                                                        */
/* -------------------------------------------------------------------------- */

const withoutUndefined = (obj: ICommonObject): ICommonObject => {
    const cleaned: ICommonObject = {}
    for (const key in obj) {
        if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') cleaned[key] = obj[key]
    }
    return cleaned
}

class ScavioTool extends DynamicStructuredTool {
    apiKey: string
    endpointPath: string
    allowedDefaults: string[]
    defaultParams: ICommonObject

    constructor(args: { endpoint: ScavioEndpoint; apiKey: string; defaultParams?: ICommonObject }) {
        super({
            name: args.endpoint.name,
            description: args.endpoint.description,
            schema: args.endpoint.schema,
            baseUrl: `${SCAVIO_BASE_URL}${args.endpoint.path}`,
            method: 'POST',
            headers: {}
        })
        this.apiKey = args.apiKey
        this.endpointPath = args.endpoint.path
        this.allowedDefaults = args.endpoint.defaults ?? []
        this.defaultParams = args.defaultParams ?? {}
    }

    async _call(arg: any): Promise<string> {
        // Node level defaults only apply to endpoints that actually accept them, and an explicit
        // tool argument always wins over the node default.
        const defaults: ICommonObject = {}
        for (const key of this.allowedDefaults) {
            if (this.defaultParams[key] !== undefined) defaults[key] = this.defaultParams[key]
        }
        const params = { ...defaults, ...withoutUndefined(arg) }

        try {
            const response = await secureAxiosRequest({
                method: 'POST',
                url: `${SCAVIO_BASE_URL}${this.endpointPath}`,
                data: params,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.apiKey}`
                }
            })
            if (response.status >= 400) {
                return formatToolError(
                    `Scavio API error (${response.status}) on ${this.endpointPath}: ${JSON.stringify(response.data).slice(0, 2000)}`,
                    params
                )
            }
            // Returned verbatim. Google responses are flat while every other family wraps the payload
            // in `data`, so unwrapping here would silently break half the tools.
            return JSON.stringify(response.data) + TOOL_ARGS_PREFIX + JSON.stringify(params)
        } catch (error: any) {
            const status = error?.response?.status
            const detail = error?.response?.data ? JSON.stringify(error.response.data) : error?.message
            return formatToolError(`Scavio API error${status ? ` (${status})` : ''} on ${this.endpointPath}: ${detail}`, params)
        }
    }
}

export const createScavioTools = (args?: RequestParameters): DynamicStructuredTool[] => {
    const platform = args?.platform ?? ''
    const actions = args?.actions ?? []
    const apiKey = args?.apiKey ?? ''
    const defaultParams = args?.defaultParams ?? {}

    const endpoints = SCAVIO_ENDPOINTS[platform] ?? []
    return endpoints.filter((e) => actions.includes(e.action)).map((e) => new ScavioTool({ endpoint: e, apiKey, defaultParams }))
}
