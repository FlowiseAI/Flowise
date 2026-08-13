import { z } from 'zod/v3'
import { DynamicStructuredTool } from '../OpenAPIToolkit/core'
import { TOOL_ARGS_PREFIX, formatToolError } from '../../../src/agents'
import { secureAxiosRequest } from '../../../src/httpSecurity'
import type { ICommonObject, INodeOptionsValue } from '../../../src/Interface'

export const SCAVIO_BASE_URL = 'https://api.scavio.dev'

export const desc = `Use this when you need real-time data from Google, YouTube, Amazon, Walmart, eBay, Target, Home Depot, Zillow, Redfin, Booking.com, Airbnb, TripAdvisor, Yelp, Indeed, Glassdoor, the Apple App Store, Google Play, SEC EDGAR, Companies House, G2, Capterra, Google Ads Transparency, the Meta Ad Library, Reddit, TikTok, TikTok Shop, Instagram, Threads, X, LinkedIn or Kuaishou through the Scavio API, or when you need to read any URL as HTML, Markdown or text`

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
    /**
     * Set only where the credit cost is a function of the request body, in which case it replaces
     * the flat cost in every description. `credits` then carries the floor of the range.
     */
    creditNote?: string
}

export interface RequestParameters {
    platform?: string
    actions?: string[]
    apiKey?: string
    defaultParams?: ICommonObject
}

const describeCost = (path: string, credits: number, creditNote?: string) =>
    creditNote ? `Scavio POST ${path}. ${creditNote}` : `Scavio POST ${path}. Costs ${credits} credit${credits === 1 ? '' : 's'}.`

const endpoint = (
    action: string,
    label: string,
    name: string,
    path: string,
    credits: number,
    summary: string,
    // eslint-disable-next-line
    schema: z.ZodObject<any, any, any, any>,
    defaults?: string[],
    creditNote?: string
): ScavioEndpoint => ({
    action,
    label,
    name,
    path,
    credits,
    description: `${summary} ${describeCost(path, credits, creditNote)}`,
    schema,
    defaults,
    creditNote
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
/* Walmart - 7 endpoints                                                      */
/* -------------------------------------------------------------------------- */

export const WALMART_ENDPOINTS: ScavioEndpoint[] = [
    endpoint(
        'search',
        'Walmart Search',
        'scavio_walmart_search',
        '/api/v1/walmart/search',
        1,
        'Search Walmart and get structured product rows (products[] + products_count + location). Pagination: page (integer >= 1); start_page is a deprecated alias.',
        z.object({
            query: z.string().describe('Product search query.'),
            start_page: z.number().int().optional().describe('Deprecated alias for page.'),
            fulfillment_speed: z
                .enum(['today', 'tomorrow'])
                .optional()
                .describe(
                    'Delivery-speed filter. 2_days and anytime are deliberately not offered: 2_days leaks 3-4 day items and anytime is a no-op, so omit the parameter instead. Options: today, tomorrow.'
                ),
            fulfillment_type: z.enum(['in_store']).optional().describe('Set to in_store to only return pickup stock. Options: in_store.'),
            domain: z
                .enum(['com', 'ca', 'com.mx'])
                .optional()
                .describe('Walmart storefront. com and ca cost 1 credit, com.mx costs 2. Options: com, ca, com.mx. Default: com.'),
            page: z.number().int().optional().describe('Result page number, 1-based.'),
            sort_by: z
                .enum(['best_match', 'price_low', 'price_high', 'best_seller', 'rating_high', 'new'])
                .optional()
                .describe(
                    'Sort order for the results. Options: best_match, price_low, price_high, best_seller, rating_high, new. Default: best_match.'
                ),
            min_price: z.number().optional().describe('Minimum price filter.'),
            max_price: z.number().optional().describe('Maximum price filter.')
        }),
        undefined,
        'Costs 1 credit on domain com or ca and 2 credits on com.mx.'
    ),
    endpoint(
        'product',
        'Walmart Product',
        'scavio_walmart_product',
        '/api/v1/walmart/product',
        1,
        'Full Walmart product detail: price, rating, images, specifications, availability, seller.',
        z.object({
            product_id: z.string().describe('Walmart item id (usItemId), e.g. 13544111159.')
        })
    ),
    endpoint(
        'reviews',
        'Walmart Reviews',
        'scavio_walmart_reviews',
        '/api/v1/walmart/reviews',
        1,
        'Customer reviews with ratings, text, author, date and the rating breakdown. Pagination: page (10 reviews per page).',
        z.object({
            product_id: z.string().describe('Walmart item id (usItemId), e.g. 13544111159.'),
            page: z.number().int().optional().describe('Result page, 1-based. 10 reviews per page.'),
            sort: z
                .enum(['relevancy', 'submission-desc', 'submission-asc', 'rating-desc', 'rating-asc', 'helpful-desc'])
                .optional()
                .describe('Review sort order. Options: relevancy, submission-desc, submission-asc, rating-desc, rating-asc, helpful-desc.')
        })
    ),
    endpoint(
        'category',
        'Walmart Category',
        'scavio_walmart_category',
        '/api/v1/walmart/category',
        1,
        'Products within a Walmart category, same product shape as search. Pagination: page; `limit` trims after fetching and does NOT reduce cost.',
        z.object({
            category_id: z.string().describe('Leaf category id (1095191) or the full underscore path (3944_133251_1095191).'),
            limit: z.number().int().optional().describe('Trims the products list after fetching. It does NOT reduce the credit cost.'),
            fulfillment_speed: z
                .enum(['today', 'tomorrow'])
                .optional()
                .describe(
                    'Delivery-speed filter. 2_days and anytime are deliberately not offered: 2_days leaks 3-4 day items and anytime is a no-op, so omit the parameter instead. Options: today, tomorrow.'
                ),
            domain: z
                .enum(['com', 'ca', 'com.mx'])
                .optional()
                .describe('Walmart storefront. com and ca cost 1 credit, com.mx costs 2. Options: com, ca, com.mx. Default: com.'),
            page: z.number().int().optional().describe('Result page number, 1-based.'),
            sort_by: z
                .enum(['best_match', 'price_low', 'price_high', 'best_seller', 'rating_high', 'new'])
                .optional()
                .describe(
                    'Sort order for the results. Options: best_match, price_low, price_high, best_seller, rating_high, new. Default: best_match.'
                ),
            min_price: z.number().optional().describe('Minimum price filter.'),
            max_price: z.number().optional().describe('Maximum price filter.')
        }),
        undefined,
        'Costs 1 credit on domain com or ca and 2 credits on com.mx.'
    ),
    endpoint(
        'offers',
        'Walmart Offers',
        'scavio_walmart_offers',
        '/api/v1/walmart/offers',
        1,
        'Seller offers for a product: price, seller, condition, buy-box flag.',
        z.object({
            product_id: z.string().describe('Walmart item id (usItemId), e.g. 13544111159.')
        })
    ),
    endpoint(
        'seller',
        'Walmart Seller',
        'scavio_walmart_seller',
        '/api/v1/walmart/seller',
        1,
        'Marketplace seller storefront: name, rating, review count, Pro Seller badge, business details.',
        z.object({
            seller_id: z
                .string()
                .describe('NUMERIC catalog seller id (the seller_catalog_id field). The GUID form of seller_id returns 404.')
        })
    ),
    endpoint(
        'sellerProducts',
        'Walmart Seller-Products',
        'scavio_walmart_seller_products',
        '/api/v1/walmart/seller-products',
        1,
        "A seller's catalog; ~40 items server-rendered, total_count is the real catalog size.",
        z.object({
            seller_id: z
                .string()
                .describe('NUMERIC catalog seller id (the seller_catalog_id field). The GUID form of seller_id returns 404.')
        })
    )
]

/* -------------------------------------------------------------------------- */
/* Threads - 6 endpoints                                                      */
/* -------------------------------------------------------------------------- */

export const THREADS_ENDPOINTS: ScavioEndpoint[] = [
    endpoint(
        'profile',
        'Threads Profile',
        'scavio_threads_profile',
        '/api/v1/threads/profile',
        2,
        'Profile details for a Threads user, by user_id (2cr) or username (4cr).',
        z.object({
            username: z
                .string()
                .optional()
                .describe(
                    'Threads handle without the @. Costs 2 extra credits because the handle has to be resolved with a second upstream call -- prefer user_id.'
                ),
            user_id: z.string().optional().describe('Numeric Threads user id, e.g. 63625256886. This is the cheap path.')
        }),
        undefined,
        'Costs 2 credits when addressed by user_id and 4 credits when addressed by username -- the handle needs a second upstream lookup, so prefer user_id.'
    ),
    endpoint(
        'userPosts',
        'Threads User Posts',
        'scavio_threads_user_posts',
        '/api/v1/threads/user/posts',
        2,
        "A user's Threads posts, cursor-paginated. Pagination: cursor -> next_cursor.",
        z.object({
            username: z
                .string()
                .optional()
                .describe(
                    'Threads handle without the @. Costs 2 extra credits because the handle has to be resolved with a second upstream call -- prefer user_id.'
                ),
            user_id: z.string().optional().describe('Numeric Threads user id, e.g. 63625256886. This is the cheap path.'),
            cursor: z
                .string()
                .optional()
                .describe(
                    "Pagination cursor taken from a previous response's next_cursor. Keep the other arguments identical across paginated calls."
                )
        }),
        undefined,
        'Costs 2 credits when addressed by user_id and 4 credits when addressed by username.'
    ),
    endpoint(
        'userReplies',
        'Threads User Replies',
        'scavio_threads_user_replies',
        '/api/v1/threads/user/replies',
        2,
        "A user's replies, cursor-paginated. Pagination: cursor -> next_cursor.",
        z.object({
            username: z
                .string()
                .optional()
                .describe(
                    'Threads handle without the @. Costs 2 extra credits because the handle has to be resolved with a second upstream call -- prefer user_id.'
                ),
            user_id: z.string().optional().describe('Numeric Threads user id, e.g. 63625256886. This is the cheap path.'),
            cursor: z
                .string()
                .optional()
                .describe(
                    "Pagination cursor taken from a previous response's next_cursor. Keep the other arguments identical across paginated calls."
                )
        }),
        undefined,
        'Costs 2 credits when addressed by user_id and 4 credits when addressed by username.'
    ),
    endpoint(
        'post',
        'Threads Post',
        'scavio_threads_post',
        '/api/v1/threads/post',
        2,
        'A single Threads post by id or threads.net URL.',
        z.object({
            post_id: z.string().optional().describe('Threads post id.'),
            url: z.string().optional().describe('A threads.net post URL, usable instead of post_id.')
        })
    ),
    endpoint(
        'postComments',
        'Threads Post Comments',
        'scavio_threads_post_comments',
        '/api/v1/threads/post/comments',
        2,
        'Replies to a Threads post, cursor-paginated. Pagination: cursor -> next_cursor.',
        z.object({
            post_id: z.string().describe('Threads post id.'),
            cursor: z
                .string()
                .optional()
                .describe(
                    "Pagination cursor taken from a previous response's next_cursor. Keep the other arguments identical across paginated calls."
                )
        })
    ),
    endpoint(
        'searchUsers',
        'Threads Search Users',
        'scavio_threads_search_users',
        '/api/v1/threads/search/users',
        2,
        'Threads profiles matching a name or handle. This is the ONLY search Threads exposes.',
        z.object({
            query: z.string().describe('Name or handle to look for.')
        })
    )
]

/* -------------------------------------------------------------------------- */
/* Kuaishou (China) - 14 endpoints                                            */
/* -------------------------------------------------------------------------- */

export const KUAISHOU_ENDPOINTS: ScavioEndpoint[] = [
    endpoint(
        'profile',
        'Kuaishou Profile',
        'scavio_kuaishou_profile',
        '/api/v1/kuaishou/profile',
        10,
        'Profile details for a Kuaishou user.',
        z.object({
            user_id: z.string().describe('Kuaishou user id.')
        })
    ),
    endpoint(
        'userPosts',
        'Kuaishou User Posts',
        'scavio_kuaishou_user_posts',
        '/api/v1/kuaishou/user/posts',
        1,
        "A user's top posts, cursor-paginated. Pagination: cursor -> next_cursor.",
        z.object({
            user_id: z.string().describe('Kuaishou user id.'),
            cursor: z
                .string()
                .optional()
                .describe(
                    "Pagination cursor taken from a previous response's next_cursor. Keep the other arguments identical across paginated calls."
                )
        })
    ),
    endpoint(
        'userLive',
        'Kuaishou User Live',
        'scavio_kuaishou_user_live',
        '/api/v1/kuaishou/user/live',
        1,
        "A user's current live-stream status.",
        z.object({
            user_id: z.string().describe('Kuaishou user id.')
        })
    ),
    endpoint(
        'userResolve',
        'Kuaishou User Resolve',
        'scavio_kuaishou_user_resolve',
        '/api/v1/kuaishou/user/resolve',
        1,
        'Turns a Kuaishou share link into a user id.',
        z.object({
            share_link: z
                .string()
                .describe(
                    'A kuaishou.com or v.kuaishou.com share link. kwai.com links are NOT supported: Kwai international is a separate property and is not covered.'
                )
        })
    ),
    endpoint(
        'video',
        'Kuaishou Video',
        'scavio_kuaishou_video',
        '/api/v1/kuaishou/video',
        2,
        'A single Kuaishou video by photo id or URL.',
        z.object({
            photo_id: z.string().optional().describe('Kuaishou photo (video) id.'),
            url: z.string().optional().describe('A kuaishou.com video URL, usable instead of photo_id.')
        })
    ),
    endpoint(
        'videoComments',
        'Kuaishou Video Comments',
        'scavio_kuaishou_video_comments',
        '/api/v1/kuaishou/video/comments',
        1,
        'Comments on a video, cursor-paginated. Pagination: cursor -> next_cursor.',
        z.object({
            photo_id: z.string().describe('Kuaishou photo (video) id.'),
            cursor: z
                .string()
                .optional()
                .describe(
                    "Pagination cursor taken from a previous response's next_cursor. Keep the other arguments identical across paginated calls."
                )
        })
    ),
    endpoint(
        'videoSubComments',
        'Kuaishou Video Sub-Comments',
        'scavio_kuaishou_comment_replies',
        '/api/v1/kuaishou/video/sub-comments',
        1,
        'Replies under a root comment on a Kuaishou video. Pagination: cursor -> next_cursor; `count` sizes the page.',
        z.object({
            photo_id: z.string().describe('Kuaishou photo (video) id.'),
            root_comment_id: z.string().describe('Id of the root comment whose replies you want.'),
            cursor: z
                .string()
                .optional()
                .describe(
                    "Pagination cursor taken from a previous response's next_cursor. Keep the other arguments identical across paginated calls."
                ),
            count: z.number().int().optional().describe('Replies to return in this page, 1-50.')
        })
    ),
    endpoint(
        'videosBatch',
        'Kuaishou Videos Batch',
        'scavio_kuaishou_videos_batch',
        '/api/v1/kuaishou/videos/batch',
        40,
        'Several Kuaishou videos in one call, max 20 photo ids.',
        z.object({
            photo_ids: z.array(z.string()).describe('Kuaishou photo ids to fetch in one call. Hard cap of 20 ids.')
        })
    ),
    endpoint(
        'search',
        'Kuaishou Search',
        'scavio_kuaishou_search',
        '/api/v1/kuaishou/search',
        10,
        'Mixed-result search across Kuaishou. Pagination: cursor -> next_cursor.',
        z.object({
            keyword: z.string().describe('Search keyword.'),
            cursor: z
                .string()
                .optional()
                .describe(
                    "Pagination cursor taken from a previous response's next_cursor. Keep the other arguments identical across paginated calls."
                )
        })
    ),
    endpoint(
        'searchVideos',
        'Kuaishou Search Videos',
        'scavio_kuaishou_search_videos',
        '/api/v1/kuaishou/search/videos',
        10,
        'Kuaishou video search results. Pagination: cursor -> next_cursor.',
        z.object({
            keyword: z.string().describe('Search keyword.'),
            cursor: z
                .string()
                .optional()
                .describe(
                    "Pagination cursor taken from a previous response's next_cursor. Keep the other arguments identical across paginated calls."
                )
        })
    ),
    endpoint(
        'searchUsers',
        'Kuaishou Search Users',
        'scavio_kuaishou_search_users',
        '/api/v1/kuaishou/search/users',
        10,
        'Kuaishou user search results. Pagination: cursor -> next_cursor.',
        z.object({
            keyword: z.string().describe('Search keyword.'),
            cursor: z
                .string()
                .optional()
                .describe(
                    "Pagination cursor taken from a previous response's next_cursor. Keep the other arguments identical across paginated calls."
                )
        })
    ),
    endpoint(
        'searchLive',
        'Kuaishou Search Live',
        'scavio_kuaishou_search_live',
        '/api/v1/kuaishou/search/live',
        10,
        'Kuaishou live-stream search results. Pagination: cursor -> next_cursor.',
        z.object({
            keyword: z.string().describe('Search keyword.'),
            cursor: z
                .string()
                .optional()
                .describe(
                    "Pagination cursor taken from a previous response's next_cursor. Keep the other arguments identical across paginated calls."
                )
        })
    ),
    endpoint(
        'tagFeed',
        'Kuaishou Tag Feed',
        'scavio_kuaishou_tag_feed',
        '/api/v1/kuaishou/tag/feed',
        1,
        'Posts under a Kuaishou hashtag, cursor-paginated. Pagination: cursor -> next_cursor.',
        z.object({
            tag: z.string().describe('Hashtag to read the feed for, without the leading #.'),
            cursor: z
                .string()
                .optional()
                .describe(
                    "Pagination cursor taken from a previous response's next_cursor. Keep the other arguments identical across paginated calls."
                )
        })
    ),
    endpoint(
        'trending',
        'Kuaishou Trending',
        'scavio_kuaishou_trending',
        '/api/v1/kuaishou/trending',
        1,
        'Kuaishou hot / live / shopping / brand / music leaderboards.',
        z.object({
            board: z
                .enum(['hot', 'live', 'shopping', 'brand', 'music'])
                .optional()
                .describe('Which leaderboard to return. Options: hot, live, shopping, brand, music. Default: hot.')
        })
    )
]

/* -------------------------------------------------------------------------- */
/* eBay - 3 endpoints                                                         */
/* -------------------------------------------------------------------------- */

export const EBAY_ENDPOINTS: ScavioEndpoint[] = [
    endpoint(
        'search',
        'eBay Search',
        'scavio_ebay_search',
        '/api/v1/ebay/search',
        1,
        'Search live or SOLD eBay listings: price, condition, bids, shipping, seller, feedback. Pagination: page; per_page accepts ONLY 60, 120 or 240 (silent fallback to 60).',
        z.object({
            query: z.string().optional().describe('Keyword query. Optional: a seller-scoped search works with no query at all.'),
            seller: z
                .string()
                .optional()
                .describe(
                    "Scope the search to one seller. Works with no query, which is the only paginated way to list a seller's whole catalogue."
                ),
            page: z.number().int().optional().describe('Result page number, 1-based.'),
            sort_by: z
                .enum(['best_match', 'ending_soonest', 'newly_listed', 'price_low', 'price_high'])
                .optional()
                .describe(
                    'Sort order for the results. Options: best_match, ending_soonest, newly_listed, price_low, price_high. Default: best_match.'
                ),
            min_price: z.number().optional().describe('Minimum price filter.'),
            max_price: z.number().optional().describe('Maximum price filter.'),
            condition: z
                .enum(['new', 'open_box', 'refurbished', 'used', 'for_parts'])
                .optional()
                .describe(
                    "Item condition. refurbished is eBay's parent condition, not one of its three graded tiers. Options: new, open_box, refurbished, used, for_parts."
                ),
            buying_format: z
                .enum(['auction', 'buy_it_now', 'best_offer'])
                .optional()
                .describe('Listing format filter. Options: auction, buy_it_now, best_offer.'),
            free_shipping: z.boolean().optional().describe('Only return listings with free shipping.'),
            sold: z
                .boolean()
                .optional()
                .describe(
                    'Search completed listings that actually SOLD -- the price-research view. eBay publishes no headline count there, so total_results comes back null.'
                ),
            category_id: z
                .string()
                .optional()
                .describe('Numeric eBay category id. A non-numeric value returns the UNFILTERED set under a 200.'),
            per_page: z
                .union([z.literal(60), z.literal(120), z.literal(240)])
                .optional()
                .describe(
                    'Listings per page. eBay accepts only 60, 120 or 240 and silently falls back to 60 for anything else. Options: 60, 120, 240. Default: 60.'
                )
        })
    ),
    endpoint(
        'product',
        'eBay Product',
        'scavio_ebay_product',
        '/api/v1/ebay/product',
        1,
        'One eBay listing in full: price, condition, images, item specifics, shipping, returns, auction state, seller.',
        z.object({
            item_id: z.string().describe('eBay item number or a full ebay.com/itm/... URL. Tracking parameters are discarded.')
        })
    ),
    endpoint(
        'seller',
        'eBay Seller',
        'scavio_ebay_seller',
        '/api/v1/ebay/seller',
        1,
        'eBay seller profile card: store name, feedback score and %, items sold, followers, location, categories.',
        z.object({
            seller: z.string().describe('eBay username as it appears in ebay.com/usr/<name>.')
        })
    )
]

/* -------------------------------------------------------------------------- */
/* Target - 4 endpoints                                                       */
/* -------------------------------------------------------------------------- */

export const TARGET_ENDPOINTS: ScavioEndpoint[] = [
    endpoint(
        'search',
        'Target Search',
        'scavio_target_search',
        '/api/v1/target/search',
        1,
        'Search Target.com: prices, ratings, badges and promotions. Pagination: page + count.',
        z.object({
            keyword: z.string().describe('Product search query.'),
            page: z.number().int().optional().describe('Result page number, 1-based.'),
            count: z.number().int().optional().describe('Products per page. Target rejects anything above 28 outright. Default: 24.'),
            sort: z
                .enum(['relevance', 'featured', 'price_low', 'price_high', 'rating_high', 'best_seller', 'newest'])
                .optional()
                .describe(
                    'Sort order for the results. Options: relevance, featured, price_low, price_high, rating_high, best_seller, newest. Default: relevance.'
                ),
            store_id: z
                .string()
                .optional()
                .describe(
                    'Numeric Target store id. Unlike Walmart this is a real request parameter: it decides prices and availability. Default: 3991.'
                )
        })
    ),
    endpoint(
        'category',
        'Target Category',
        'scavio_target_category',
        '/api/v1/target/category',
        1,
        'Products in a Target category, same shape as search plus the category breadcrumb. Pagination: page + count.',
        z.object({
            category_id: z.string().describe('The segment after `N-` in a target.com /c/ URL.'),
            page: z.number().int().optional().describe('Result page number, 1-based.'),
            count: z.number().int().optional().describe('Products per page. Target rejects anything above 28 outright. Default: 24.'),
            sort: z
                .enum(['relevance', 'featured', 'price_low', 'price_high', 'rating_high', 'best_seller', 'newest'])
                .optional()
                .describe(
                    'Sort order for the results. Options: relevance, featured, price_low, price_high, rating_high, best_seller, newest. Default: relevance.'
                ),
            store_id: z
                .string()
                .optional()
                .describe(
                    'Numeric Target store id. Unlike Walmart this is a real request parameter: it decides prices and availability. Default: 3991.'
                )
        })
    ),
    endpoint(
        'product',
        'Target Product',
        'scavio_target_product',
        '/api/v1/target/product',
        1,
        'Target product details by TCIN: price, rating, images, specifications, variants, return policy, fulfillment.',
        z.object({
            tcin: z
                .string()
                .describe(
                    'Target catalog item number. A child TCIN is answered by its variation parent, with the child present under variants.'
                ),
            store_id: z
                .string()
                .optional()
                .describe(
                    'Numeric Target store id. Unlike Walmart this is a real request parameter: it decides prices and availability. Default: 3991.'
                )
        })
    ),
    endpoint(
        'reviews',
        'Target Reviews',
        'scavio_target_reviews',
        '/api/v1/target/reviews',
        1,
        'Target reviews with the rating breakdown, per-attribute averages and guest photos.',
        z.object({
            tcin: z
                .string()
                .describe(
                    'Target catalog item number. A child TCIN is answered by its variation parent, with the child present under variants.'
                ),
            limit: z
                .number()
                .int()
                .optional()
                .describe(
                    'TRIMS the returned bodies only. Target publishes 8 reviews anonymously and offers no paging, so this cannot fetch more.'
                ),
            store_id: z
                .string()
                .optional()
                .describe(
                    'Numeric Target store id. Unlike Walmart this is a real request parameter: it decides prices and availability. Default: 3991.'
                )
        })
    )
]

/* -------------------------------------------------------------------------- */
/* Home Depot - 3 endpoints                                                   */
/* -------------------------------------------------------------------------- */

export const HOME_DEPOT_ENDPOINTS: ScavioEndpoint[] = [
    endpoint(
        'search',
        'Home Depot Search',
        'scavio_home_depot_search',
        '/api/v1/homedepot/search',
        2,
        'Search Home Depot: price and promotions, brand and model, ratings, badges, per-store pickup/delivery. Pagination: page -- page size is FIXED at 12 and cannot be changed.',
        z.object({
            query: z.string().describe('Product search query.'),
            page: z.number().int().optional().describe('Result page, 1-based. 12 products per page, fixed.'),
            sort_by: z
                .enum(['best_match', 'top_sellers', 'top_rated', 'price_low', 'price_high'])
                .optional()
                .describe(
                    'Sort order. The set is closed because Home Depot answers an unknown sort with an empty page rather than falling back. Options: best_match, top_sellers, top_rated, price_low, price_high. Default: best_match.'
                ),
            min_price: z.number().optional().describe('Minimum price filter.'),
            max_price: z.number().optional().describe('Maximum price filter.')
        })
    ),
    endpoint(
        'product',
        'Home Depot Product',
        'scavio_home_depot_product',
        '/api/v1/homedepot/product',
        2,
        'Full Home Depot item detail: pricing, images and videos, spec table, dimensions, bullets, documents, return policy.',
        z.object({
            item_id: z.string().describe('Home Depot item id or a full homedepot.com/p/... URL. Tracking parameters are discarded.')
        })
    ),
    endpoint(
        'reviews',
        'Home Depot Reviews',
        'scavio_home_depot_reviews',
        '/api/v1/homedepot/reviews',
        2,
        'One page of full Home Depot review bodies, rating distribution, per-attribute ratings, photos, seller responses. Pagination: page -- 30 per page; total_pages is the last that exists and asking past it is a 404.',
        z.object({
            item_id: z.string().describe('Home Depot item id or a full homedepot.com/p/... URL. Tracking parameters are discarded.'),
            page: z.number().int().optional().describe('Result page, 1-based. 30 reviews per page; asking past total_pages is a 404.')
        })
    )
]

/* -------------------------------------------------------------------------- */
/* Zillow - 3 endpoints                                                       */
/* -------------------------------------------------------------------------- */

export const ZILLOW_ENDPOINTS: ScavioEndpoint[] = [
    endpoint(
        'search',
        'Zillow Search',
        'scavio_zillow_search',
        '/api/v1/zillow/search',
        1,
        'Zillow listings in a region: price, beds, baths, living area, Zestimate, coordinates, images, days on market. Pagination: page.',
        z.object({
            location: z
                .string()
                .describe(
                    'Zillow region slug, human city name, ZIP, or a pasted search URL. A bare ZIP works alone but CANNOT be combined with a filter or a sort -- use the city name there.'
                ),
            listing_status: z
                .enum(['for_sale', 'for_rent', 'sold'])
                .optional()
                .describe('Which listing state to return. Options: for_sale, for_rent, sold. Default: for_sale.'),
            page: z.number().int().optional().describe('Result page number, 1-based.'),
            sort: z
                .enum([
                    'relevance',
                    'recommended',
                    'newest',
                    'price_low',
                    'price_high',
                    'payment_low',
                    'payment_high',
                    'beds',
                    'baths',
                    'sqft',
                    'lot_size',
                    'zestimate_low',
                    'zestimate_high',
                    'recent_change'
                ])
                .optional()
                .describe(
                    'Sort order for the results. Options: relevance, recommended, newest, price_low, price_high, payment_low, payment_high, beds, baths, sqft, lot_size, zestimate_low, zestimate_high, recent_change.'
                ),
            min_price: z.number().optional().describe('Minimum price. On listing_status=for_rent this means MONTHLY RENT.'),
            max_price: z.number().optional().describe('Maximum price. On listing_status=for_rent this means MONTHLY RENT.'),
            beds_min: z.number().int().optional().describe('Minimum number of bedrooms.'),
            beds_max: z.number().int().optional().describe('Maximum number of bedrooms.'),
            baths_min: z.number().optional().describe('Minimum number of bathrooms. Half-baths allowed (1.5).'),
            baths_max: z.number().optional().describe('Maximum number of bathrooms.'),
            sqft_min: z.number().int().optional().describe('Minimum living area in square feet.'),
            sqft_max: z.number().int().optional().describe('Maximum living area in square feet.'),
            lot_size_min: z.number().int().optional().describe('Minimum lot size in square feet.'),
            lot_size_max: z.number().int().optional().describe('Maximum lot size in square feet.'),
            year_built_min: z.number().int().optional().describe('Earliest year built.'),
            year_built_max: z.number().int().optional().describe('Latest year built.'),
            max_hoa: z.number().optional().describe('Maximum monthly HOA fee.'),
            home_type: z
                .enum(['houses', 'townhomes', 'multi_family', 'condos', 'apartments', 'manufactured', 'lots_land'])
                .optional()
                .describe('Property type filter. Options: houses, townhomes, multi_family, condos, apartments, manufactured, lots_land.'),
            days_on_zillow: z
                .enum(['1', '7', '14', '30', '90', '6m', '12m', '24m', '36m'])
                .optional()
                .describe(
                    'How recently the listing appeared. Closed set: an unrecognised value returns the UNFILTERED result set under a 200. Options: 1, 7, 14, 30, 90, 6m, 12m, 24m, 36m.'
                ),
            keywords: z.string().optional().describe('Extra keywords to match inside the listing text.'),
            has_pool: z.boolean().optional().describe('Only return properties with a pool.'),
            has_garage: z.boolean().optional().describe('Only return properties with a garage.'),
            has_air_conditioning: z.boolean().optional().describe('Only return properties with air conditioning.'),
            is_waterfront: z.boolean().optional().describe('Only return waterfront properties.'),
            has_basement: z.boolean().optional().describe('Only return properties with a basement.'),
            is_new_construction: z.boolean().optional().describe('Only return new construction.'),
            has_open_house: z.boolean().optional().describe('Only return listings with an open house scheduled.'),
            price_reduced: z.boolean().optional().describe('Only return listings whose price was reduced.'),
            is_3d_tour: z.boolean().optional().describe('Only return listings with a 3D tour.')
        })
    ),
    endpoint(
        'property',
        'Zillow Property',
        'scavio_zillow_property',
        '/api/v1/zillow/property',
        1,
        'Full Zillow listing: price and price history, Zestimate, tax history, RESO facts, rooms, schools, open houses, photos.',
        z.object({
            zpid: z
                .string()
                .describe(
                    'Zillow property id, a /homedetails/ URL, or a zillow.com/apartments/ building URL. Rental buildings have no visible zpid -- pass the URL.'
                )
        })
    ),
    endpoint(
        'reviews',
        'Zillow Reviews',
        'scavio_zillow_agent_reviews',
        '/api/v1/zillow/reviews',
        1,
        "A Zillow AGENT's profile and reviews: rating, bodies with sub-ratings, specialties, licenses, service areas, sales counts.",
        z.object({
            screen_name: z
                .string()
                .describe(
                    "The AGENT's zillow.com/profile/<name>/ screen name, or the full profile URL. This endpoint addresses an agent, not a property."
                )
        })
    )
]

/* -------------------------------------------------------------------------- */
/* Booking.com - 3 endpoints                                                  */
/* -------------------------------------------------------------------------- */

export const BOOKING_ENDPOINTS: ScavioEndpoint[] = [
    endpoint(
        'search',
        'Booking Search',
        'scavio_booking_search',
        '/api/v1/booking/search',
        1,
        'Booking.com properties for a destination and stay: live nightly price, review score, star rating, room type, deal badges. Pagination: page -- 25 properties per page.',
        z.object({
            destination: z
                .string()
                .optional()
                .describe(
                    "Destination name. Either destination or dest_id is required -- a search with neither returns Booking's homepage and still costs a credit."
                ),
            dest_id: z.string().optional().describe("Booking's numeric destination id."),
            dest_type: z
                .enum(['city', 'region', 'country', 'district', 'landmark', 'airport', 'hotel'])
                .optional()
                .describe('What dest_id refers to. Requires dest_id. Options: city, region, country, district, landmark, airport, hotel.'),
            page: z.number().int().optional().describe('Result page, 1-based. 25 properties per page.'),
            sort_by: z
                .enum(['popularity', 'price_low', 'price_high', 'stars_high', 'stars_low', 'stars_and_price', 'distance', 'review_score'])
                .optional()
                .describe(
                    'Sort order for the results. Options: popularity, price_low, price_high, stars_high, stars_low, stars_and_price, distance, review_score. Default: popularity.'
                ),
            min_price: z.number().optional().describe('Minimum price PER NIGHT, in `currency`.'),
            max_price: z.number().optional().describe('Maximum price PER NIGHT, in `currency`.'),
            stars: z.array(z.number().int()).optional().describe("Star ratings to include. Values are OR'd together."),
            min_review_score: z
                .enum(['6', '7', '8', '9'])
                .optional()
                .describe(
                    'Minimum guest review score. Only 6, 7, 8 and 9 are accepted -- any other threshold is silently dropped upstream. Options: 6, 7, 8, 9.'
                ),
            property_type: z
                .union([z.string(), z.number().int()])
                .optional()
                .describe(
                    'Accommodation type: one of the named values, or a raw numeric Booking accommodation-type id. Options: apartments, hostels, hotels, motels, resorts, bed_and_breakfasts, villas, campgrounds, vacation_homes, lodges, homestays.'
                ),
            free_cancellation: z.boolean().optional().describe('Only return rates with free cancellation.'),
            no_prepayment: z.boolean().optional().describe('Only return rates with no prepayment.'),
            breakfast_included: z.boolean().optional().describe('Only return rates that include breakfast.'),
            checkin: z.string().optional().describe('Check-in date, YYYY-MM-DD. Must be sent together with checkout.'),
            checkout: z.string().optional().describe('Check-out date, YYYY-MM-DD. Must be sent together with checkin.'),
            adults: z.number().int().optional().describe('Number of adult guests. Default: 2.'),
            children_ages: z
                .array(z.number().int())
                .optional()
                .describe('Ages of the children in the party, one entry per child. Ages, not a count.'),
            rooms: z.number().int().optional().describe('Number of rooms required. Default: 1.'),
            currency: z.string().optional().describe('ISO 4217 currency code the prices come back in. Default: USD.')
        })
    ),
    endpoint(
        'hotel',
        'Booking Hotel',
        'scavio_booking_hotel',
        '/api/v1/booking/hotel',
        1,
        'One Booking.com property in full: rooms and rate plans, facilities, house rules, policies, images, review scores.',
        z.object({
            hotel: z.string().describe('booking.com property URL or the bare page slug. Query parameters are discarded.'),
            country_code: z
                .string()
                .optional()
                .describe(
                    'Two-letter country code. Only consulted when `hotel` is a bare slug; a wrong one is a real, BILLED 404. Default: us.'
                ),
            checkin: z.string().optional().describe('Check-in date, YYYY-MM-DD. Must be sent together with checkout.'),
            checkout: z.string().optional().describe('Check-out date, YYYY-MM-DD. Must be sent together with checkin.'),
            adults: z.number().int().optional().describe('Number of adult guests. Default: 2.'),
            children_ages: z.array(z.number().int()).optional().describe('Ages of the children in the party, one entry per child.'),
            rooms: z.number().int().optional().describe('Number of rooms required. Default: 1.'),
            currency: z.string().optional().describe('ISO 4217 currency code the prices come back in. Default: USD.')
        })
    ),
    endpoint(
        'reviews',
        'Booking Reviews',
        'scavio_booking_reviews',
        '/api/v1/booking/reviews',
        1,
        "Booking.com guest reviews with the score breakdown by category and Booking's own praise/complaint summary.",
        z.object({
            hotel: z.string().describe('booking.com property URL or the bare page slug. Query parameters are discarded.'),
            country_code: z
                .string()
                .optional()
                .describe(
                    'Two-letter country code. Only consulted when `hotel` is a bare slug; a wrong one is a real, BILLED 404. Default: us.'
                ),
            checkin: z.string().optional().describe('Check-in date, YYYY-MM-DD. Must be sent together with checkout.'),
            checkout: z.string().optional().describe('Check-out date, YYYY-MM-DD. Must be sent together with checkin.'),
            adults: z.number().int().optional().describe('Number of adult guests. Default: 2.'),
            children_ages: z.array(z.number().int()).optional().describe('Ages of the children in the party, one entry per child.'),
            rooms: z.number().int().optional().describe('Number of rooms required. Default: 1.'),
            currency: z.string().optional().describe('ISO 4217 currency code the prices come back in. Default: USD.')
        })
    )
]

/* -------------------------------------------------------------------------- */
/* TripAdvisor - 4 endpoints                                                  */
/* -------------------------------------------------------------------------- */

export const TRIPADVISOR_ENDPOINTS: ScavioEndpoint[] = [
    endpoint(
        'locations',
        'TripAdvisor Locations',
        'scavio_tripadvisor_locations',
        '/api/v1/tripadvisor/locations',
        2,
        'Tripadvisor: START HERE. Resolve a place or business NAME to the TripAdvisor geo_id / location_id pair every other endpoint needs.',
        z.object({
            query: z.string().describe('Place or business NAME to resolve into TripAdvisor ids.'),
            limit: z.number().int().optional().describe('Maximum rows to return, 1-20. Default: 12.')
        })
    ),
    endpoint(
        'search',
        'TripAdvisor Search',
        'scavio_tripadvisor_search',
        '/api/v1/tripadvisor/search',
        2,
        'Tripadvisor: Restaurants / hotels / attractions in a TripAdvisor geo, TripAdvisor-ranked; each row carries the location_id + geo_id pair. Pagination: page -- 30 locations per page; a page beyond the last is a 404, not an empty result.',
        z.object({
            geo_id: z.string().optional().describe('TripAdvisor geo id. Accepts 30196, g30196, or a URL carrying one.'),
            category: z
                .enum(['restaurants', 'hotels', 'attractions'])
                .optional()
                .describe(
                    "Which family the location belongs to. On reviews it also sets the page size (15 for restaurants, 10 for hotels and attractions), so it must match the location's own type on any page past the first. Options: restaurants, hotels, attractions. Default: restaurants."
                ),
            page: z
                .number()
                .int()
                .optional()
                .describe('Result page, 1-based. 30 locations per page; a page beyond the last is a 404, not an empty result.'),
            url: z.string().optional().describe('Full tripadvisor.com listing URL, usable instead of the ids. Country sites are accepted.')
        })
    ),
    endpoint(
        'location',
        'TripAdvisor Location',
        'scavio_tripadvisor_location',
        '/api/v1/tripadvisor/location',
        2,
        'Tripadvisor: One TripAdvisor location in full: rating histogram, sub-ratings, city ranking, amenities, contact, photos, and the FIRST PAGE OF REVIEWS.',
        z.object({
            location_id: z.string().optional().describe('TripAdvisor location id. Accepts 1899234, d1899234, or a full _Review URL.'),
            geo_id: z.string().optional().describe('TripAdvisor geo id. Accepts 30196, g30196, or a URL carrying one.'),
            category: z
                .enum(['restaurants', 'hotels', 'attractions'])
                .optional()
                .describe(
                    "Which family the location belongs to. On reviews it also sets the page size (15 for restaurants, 10 for hotels and attractions), so it must match the location's own type on any page past the first. Options: restaurants, hotels, attractions. Default: restaurants."
                ),
            url: z.string().optional().describe('Full tripadvisor.com listing URL, usable instead of the ids. Country sites are accepted.')
        })
    ),
    endpoint(
        'reviews',
        'TripAdvisor Reviews',
        'scavio_tripadvisor_reviews',
        '/api/v1/tripadvisor/reviews',
        2,
        "Tripadvisor: A page of TripAdvisor reviews: rating, trip date and type, reviewer home town and contribution count, management response. Pagination: page -- 15 per page for restaurants, 10 for hotels and attractions, so `category` must match the location's own type on any page past the first.",
        z.object({
            location_id: z.string().optional().describe('TripAdvisor location id. Accepts 1899234, d1899234, or a full _Review URL.'),
            geo_id: z.string().optional().describe('TripAdvisor geo id. Accepts 30196, g30196, or a URL carrying one.'),
            category: z
                .enum(['restaurants', 'hotels', 'attractions'])
                .optional()
                .describe(
                    "Which family the location belongs to. On reviews it also sets the page size (15 for restaurants, 10 for hotels and attractions), so it must match the location's own type on any page past the first. Options: restaurants, hotels, attractions. Default: restaurants."
                ),
            url: z.string().optional().describe('Full tripadvisor.com listing URL, usable instead of the ids. Country sites are accepted.'),
            page: z
                .number()
                .int()
                .optional()
                .describe(
                    'Result page, 1-based. Page 1 is already inside the location endpoint -- use this to page PAST it. Past the last page is a 404.'
                )
        })
    )
]

/* -------------------------------------------------------------------------- */
/* Indeed - 4 endpoints                                                       */
/* -------------------------------------------------------------------------- */

export const INDEED_ENDPOINTS: ScavioEndpoint[] = [
    endpoint(
        'search',
        'Indeed Search',
        'scavio_indeed_search',
        '/api/v1/indeed/search',
        2,
        'Indeed job postings: title, employer, rating, location, salary range, job type, benefits, posting age, apply route. Pagination: page -- 10 postings per page.',
        z.object({
            query: z.string().optional().describe('Job title, keyword or company. Optional if location is set.'),
            location: z
                .string()
                .optional()
                .describe(
                    "City and state, postal code, state, country or 'Remote'. Usable with no query at all -- that returns every posting in a metro."
                ),
            page: z.number().int().optional().describe('Result page, 1-based. 10 postings per page.'),
            radius: z
                .union([
                    z.literal(0),
                    z.literal(5),
                    z.literal(10),
                    z.literal(15),
                    z.literal(25),
                    z.literal(35),
                    z.literal(50),
                    z.literal(100)
                ])
                .optional()
                .describe(
                    'Search radius in miles. Closed set: Indeed IGNORES any other value and returns the unfiltered set, so asking for 7 would silently buy 50. Options: 0, 5, 10, 15, 25, 35, 50, 100. Default: 50.'
                ),
            max_age_days: z
                .union([z.literal(1), z.literal(3), z.literal(7), z.literal(14)])
                .optional()
                .describe('Only postings published within this many days. Closed set for the same reason as radius. Options: 1, 3, 7, 14.'),
            job_type: z
                .enum(['full_time', 'part_time', 'contract', 'temporary', 'internship'])
                .optional()
                .describe('Employment type filter. Options: full_time, part_time, contract, temporary, internship.'),
            min_salary: z
                .number()
                .optional()
                .describe(
                    "Minimum salary. This filters on INDEED'S OWN ESTIMATE for the role, not a posted figure, so postings that publish no salary still match."
                ),
            remote: z.boolean().optional().describe('Only return remote roles.')
        })
    ),
    endpoint(
        'job',
        'Indeed Job',
        'scavio_indeed_job',
        '/api/v1/indeed/job',
        2,
        'One Indeed posting in full: description text and HTML, structured salary, employment types, benefits, geocoded address, original ATS link.',
        z.object({
            job_id: z.string().describe('16-hex Indeed job key, or any indeed.com URL carrying jk= (/viewjob, /rc/clk, /pagead/clk).')
        })
    ),
    endpoint(
        'company',
        'Indeed Company',
        'scavio_indeed_company',
        '/api/v1/indeed/company',
        2,
        'Indeed employer profile: description, industry, HQ, size, revenue, CEO approval, per-category ratings, reported salaries, open roles.',
        z.object({
            company: z
                .string()
                .describe("indeed.com/cmp/<slug> slug or a full profile URL. Slugs are untidy, e.g. 'Tata-Consultancy-Services-(tcs)'.")
        })
    ),
    endpoint(
        'companyReviews',
        'Indeed Company Reviews',
        'scavio_indeed_company_reviews',
        '/api/v1/indeed/company/reviews',
        2,
        'Indeed employee reviews with per-category ratings, pros/cons, reviewer job title and location, plus aggregated sentiment and breakdowns. Pagination: page -- 20 reviews per page.',
        z.object({
            company: z
                .string()
                .describe("indeed.com/cmp/<slug> slug or a full profile URL. Slugs are untidy, e.g. 'Tata-Consultancy-Services-(tcs)'."),
            page: z.number().int().optional().describe('Result page, 1-based. 20 reviews per page.')
        })
    )
]

/* -------------------------------------------------------------------------- */
/* Airbnb - 3 endpoints                                                       */
/* -------------------------------------------------------------------------- */

export const AIRBNB_ENDPOINTS: ScavioEndpoint[] = [
    endpoint(
        'search',
        'Airbnb Search',
        'scavio_airbnb_search',
        '/api/v1/airbnb/search',
        1,
        'Airbnb stays: stay-total and per-night price with the full discount ledger, rating, bedrooms/beds/baths, coordinates, badges, images. Pagination: page XOR cursor -- `cursor` WINS over `page`, so sending both is REJECTED. 18 listings per page.',
        z.object({
            location: z.string().describe('City, region, ZIP, or a pasted airbnb.com/s/ URL. An unresolvable place is a 404.'),
            check_in: z
                .string()
                .optional()
                .describe(
                    'Check-in date, YYYY-MM-DD. Must be sent with check_out. Omitting both makes Airbnb A/B both the window AND the prices -- the response flags that as dates_are_defaulted. Default: +30d when omitted (transport).'
                ),
            check_out: z
                .string()
                .optional()
                .describe('Check-out date, YYYY-MM-DD. Must be sent with check_in. Default: check_in + 5 nights when omitted.'),
            adults: z.number().int().optional().describe('Number of adult guests.'),
            children: z.number().int().optional().describe('Number of children in the party (ages 2-12).'),
            infants: z.number().int().optional().describe('Number of infants in the party.'),
            pets: z.number().int().optional().describe('Number of pets travelling.'),
            min_price: z.number().optional().describe('Minimum WHOLE-STAY total, not a per-night rate.'),
            max_price: z.number().optional().describe('Maximum WHOLE-STAY total, not a per-night rate.'),
            room_type: z
                .enum(['entire_home', 'private_room', 'shared_room', 'hotel_room'])
                .optional()
                .describe('Room type filter. Options: entire_home, private_room, shared_room, hotel_room.'),
            min_bedrooms: z.number().int().optional().describe('Minimum number of bedrooms.'),
            min_beds: z.number().int().optional().describe('Minimum number of beds.'),
            min_bathrooms: z.number().int().optional().describe('Minimum number of bathrooms.'),
            superhost: z.boolean().optional().describe('Only return Superhost listings.'),
            instant_book: z.boolean().optional().describe('Only return instant-book listings.'),
            guest_favorite: z.boolean().optional().describe('Only return Guest Favourite listings.'),
            free_cancellation: z.boolean().optional().describe('Only return listings with free cancellation.'),
            amenities: z
                .string()
                .optional()
                .describe(
                    'Comma-separated amenity filter. Named vocabulary: wifi, air_conditioning, pool, kitchen, free_parking, washer, self_check_in, tv -- or raw numeric Airbnb amenity ids. An unrecognised NAME is rejected before the scrape. Options: wifi, air_conditioning, pool, kitchen, free_parking, washer, self_check_in, tv.'
                ),
            currency: z.string().optional().describe('ISO 4217 currency code the prices come back in. Default: USD.'),
            page: z.number().int().optional().describe('Result page, 1-based. 18 listings per page. Cannot be combined with cursor.'),
            cursor: z.string().optional().describe('next_cursor from a previous response. Wins over page, so sending both is rejected.')
        })
    ),
    endpoint(
        'listing',
        'Airbnb Listing',
        'scavio_airbnb_listing',
        '/api/v1/airbnb/listing',
        1,
        'One Airbnb listing in full: description, capacity, the complete grouped amenity list, host profile, house rules, photo tour, and the RATING BREAKDOWN.',
        z.object({
            listing_id: z
                .string()
                .describe(
                    "Airbnb listing id or a full /rooms/ URL. Query parameters are discarded because they carry someone else's dates."
                ),
            check_in: z
                .string()
                .optional()
                .describe(
                    'Check-in date, YYYY-MM-DD. Must be sent with check_out. Omitting both makes Airbnb A/B both the window AND the prices -- the response flags that as dates_are_defaulted.'
                ),
            check_out: z.string().optional().describe('Check-out date, YYYY-MM-DD. Must be sent with check_in.'),
            adults: z.number().int().optional().describe('Number of adult guests.'),
            children: z.number().int().optional().describe('Number of children in the party (ages 2-12).'),
            infants: z.number().int().optional().describe('Number of infants in the party.'),
            pets: z.number().int().optional().describe('Number of pets travelling.'),
            currency: z.string().optional().describe('ISO 4217 currency code the prices come back in. Default: USD.')
        })
    ),
    endpoint(
        'reviews',
        'Airbnb Reviews',
        'scavio_airbnb_reviews',
        '/api/v1/airbnb/reviews',
        1,
        'Airbnb review BODIES with per-review rating, date, and reviewer name/photo/location. Pagination: limit + offset.',
        z.object({
            listing_id: z
                .string()
                .describe(
                    "Airbnb listing id or a full /rooms/ URL. Query parameters are discarded because they carry someone else's dates."
                ),
            currency: z.string().optional().describe('ISO 4217 currency code the prices come back in. Default: USD.'),
            limit: z
                .number()
                .int()
                .optional()
                .describe(
                    'Reviews per page, 1-50. Airbnb returns a fixed 7 when no explicit limit is sent, so always set it. Default: 30.'
                ),
            offset: z.number().int().optional().describe('Zero-based review offset for paging. Default: 0.')
        })
    )
]

/* -------------------------------------------------------------------------- */
/* Glassdoor - 4 endpoints                                                    */
/* -------------------------------------------------------------------------- */

export const GLASSDOOR_ENDPOINTS: ScavioEndpoint[] = [
    endpoint(
        'companies',
        'Glassdoor Companies',
        'scavio_glassdoor_companies',
        '/api/v1/glassdoor/companies',
        1,
        'START HERE. Search Glassdoor by company NAME and resolve it to the employer_id every other endpoint needs.',
        z.object({
            query: z.string().describe('Company NAME to resolve into an employer_id.')
        })
    ),
    endpoint(
        'company',
        'Glassdoor Company',
        'scavio_glassdoor_company',
        '/api/v1/glassdoor/company',
        1,
        'Glassdoor employer profile: ratings, star distribution, CEO approval, size/revenue bands, awards, five server-rendered reviews, plus reviews_url / salaries_url.',
        z.object({
            employer_id: z
                .string()
                .optional()
                .describe('Glassdoor employer id as a STRING -- a JSON number is rejected. Accepts 1699, E1699 or IE1699.'),
            company: z
                .string()
                .optional()
                .describe(
                    'Company name. COSMETIC only: the profile resolves on employer_id alone, it is ignored entirely when url is set, and it does not satisfy the required-identifier rule.'
                ),
            url: z
                .string()
                .optional()
                .describe('Any glassdoor.com employer URL (/Overview/, /Reviews/, /Salary/). Non-glassdoor.com hosts are rejected.')
        })
    ),
    endpoint(
        'reviews',
        'Glassdoor Reviews',
        'scavio_glassdoor_reviews',
        '/api/v1/glassdoor/reviews',
        1,
        'Up to THREE full Glassdoor reviews with per-axis scores, pros, cons, advice, employer response -- plus complete rating statistics and per-job-title review counts.',
        z.object({
            employer_id: z
                .string()
                .optional()
                .describe('Glassdoor employer id as a STRING -- a JSON number is rejected. Accepts 1699, E1699 or IE1699.'),
            company: z
                .string()
                .optional()
                .describe(
                    'Company name. COSMETIC only: the profile resolves on employer_id alone, it is ignored entirely when url is set, and it does not satisfy the required-identifier rule.'
                ),
            url: z
                .string()
                .optional()
                .describe(
                    'Pass back reviews_url from the company endpoint to skip the resolve fetch -- addressing this endpoint by employer_id costs two upstream fetches.'
                ),
            category: z
                .enum(['career_development', 'compensation', 'culture', 'diversity_and_inclusion', 'management', 'work_life_balance'])
                .optional()
                .describe(
                    'Review category filter. Closed set: Glassdoor IGNORES an unknown value and returns the unfiltered set under a 200. Options: career_development, compensation, culture, diversity_and_inclusion, management, work_life_balance.'
                ),
            employment_status: z
                .enum(['full_time', 'part_time', 'contract', 'intern'])
                .optional()
                .describe(
                    'Reviewer employment status filter. Closed set for the same reason as category. Options: full_time, part_time, contract, intern.'
                )
        })
    ),
    endpoint(
        'salaries',
        'Glassdoor Salaries',
        'scavio_glassdoor_salaries',
        '/api/v1/glassdoor/salaries',
        1,
        'Glassdoor salaries by job title: base-pay and total-pay percentiles P10-P90 with medians, sample counts, currency, pay period, last-reported date. Pagination: page -- 10 job titles per page; page_count on the response is how many exist.',
        z.object({
            employer_id: z
                .string()
                .optional()
                .describe('Glassdoor employer id as a STRING -- a JSON number is rejected. Accepts 1699, E1699 or IE1699.'),
            company: z
                .string()
                .optional()
                .describe(
                    'Company name. COSMETIC only: the profile resolves on employer_id alone, it is ignored entirely when url is set, and it does not satisfy the required-identifier rule.'
                ),
            url: z.string().optional().describe('Pass back salaries_url from the company endpoint to skip the resolve fetch.'),
            page: z
                .number()
                .int()
                .optional()
                .describe('Result page, 1-based. 10 job titles per page; page_count on the response says how many exist.')
        })
    )
]

/* -------------------------------------------------------------------------- */
/* Yelp - 3 endpoints                                                         */
/* -------------------------------------------------------------------------- */

export const YELP_ENDPOINTS: ScavioEndpoint[] = [
    endpoint(
        'search',
        'Yelp Search',
        'scavio_yelp_search',
        '/api/v1/yelp/search',
        2,
        "Businesses in Yelp's ranked order: rating, review count, price band, categories, address, contact rails, hours, photos, review snippet. Pagination: page -- Yelp fixes the page size at 10.",
        z.object({
            term: z.string().optional().describe("What to look for, e.g. 'coffee' or a business name."),
            location: z
                .string()
                .optional()
                .describe(
                    'City, neighbourhood or address. Effectively required: without it Yelp geolocates off the proxy exit and the same request answers about a different metro run to run.'
                ),
            page: z.number().int().optional().describe('Result page, 1-based. Yelp fixes the page size at 10.'),
            sort: z
                .enum(['recommended', 'rating', 'review_count'])
                .optional()
                .describe(
                    'Sort order. Closed set: Yelp IGNORES an unrecognised value and serves default ranking under a billed 200. Options: recommended, rating, review_count. Default: recommended.'
                ),
            price: z
                .array(z.number().int())
                .optional()
                .describe('Price bands to include, 1 (cheapest) to 4 (priciest). Options: 1, 2, 3, 4.'),
            open_now: z.boolean().optional().describe('Only return businesses open right now.'),
            attributes: z
                .array(z.string())
                .optional()
                .describe(
                    'Raw Yelp filter aliases sent through as attrs, e.g. RestaurantsDelivery, GoodForKids, WheelchairAccessible. This is a passthrough, not a closed enum: an alias Yelp does not know is ignored and results come back unfiltered.'
                ),
            url: z.string().optional().describe('Full yelp.com/search URL, usable instead of term plus location.')
        })
    ),
    endpoint(
        'business',
        'Yelp Business',
        'scavio_yelp_business',
        '/api/v1/yelp/business',
        2,
        'One Yelp business in full: per-star histogram, price band, address and coordinates, hours, amenities, photos, health inspections, Q&A -- PLUS the first page of reviews at no extra cost.',
        z.object({
            business_id: z.string().optional().describe('Yelp alias (desnudo-coffee-austin-2), opaque encid, or a yelp.com/biz URL.'),
            url: z.string().optional().describe('Full listing URL, usable instead of the id fields.')
        })
    ),
    endpoint(
        'reviews',
        'Yelp Reviews',
        'scavio_yelp_reviews',
        '/api/v1/yelp/reviews',
        2,
        'A page of Yelp reviews: rating, full text, language, author profile and expertise counts, attached photos, reaction counts, owner response. Pagination: page -- 10 per page; a page past the last is a 404, not an empty result.',
        z.object({
            business_id: z.string().optional().describe('Yelp alias (desnudo-coffee-austin-2), opaque encid, or a yelp.com/biz URL.'),
            url: z.string().optional().describe('Full listing URL, usable instead of the id fields.'),
            page: z
                .number()
                .int()
                .optional()
                .describe(
                    'Result page, 1-based. PAGE 1 IS REDUNDANT with the business endpoint and costs another 2 credits -- start at page 2. A page past the last is a 404.'
                ),
            sort: z
                .enum(['relevance', 'newest', 'oldest', 'rating_high', 'rating_low', 'elites'])
                .optional()
                .describe(
                    'Sort order. Closed set: Yelp IGNORES an unrecognised value and serves default ranking under a billed 200. Options: relevance, newest, oldest, rating_high, rating_low, elites. Default: relevance.'
                ),
            rating: z
                .union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)])
                .optional()
                .describe(
                    'Only return reviews with this star rating. Changes filtered_review_count, not review_count. Options: 1, 2, 3, 4, 5.'
                )
        })
    )
]

/* -------------------------------------------------------------------------- */
/* Apple App Store - 3 endpoints                                              */
/* -------------------------------------------------------------------------- */

export const APP_STORE_ENDPOINTS: ScavioEndpoint[] = [
    endpoint(
        'search',
        'App Store Search',
        'scavio_app_store_search',
        '/api/v1/appstore/search',
        1,
        'Up to 200 fully-shaped App Store apps (the same 43-field row as /app). Doubles as a bulk metadata fetch and a publisher lookup.',
        z.object({
            term: z
                .string()
                .describe(
                    'Search term. Matches the app name, a keyword, OR a publisher name -- searching a developer returns their catalogue.'
                ),
            limit: z
                .number()
                .int()
                .optional()
                .describe(
                    'Apps to return, 1-200. This is the ONLY lever on result volume: App Store search has no pagination and every offset spelling is silently ignored. Default: 25.'
                ),
            country: z
                .string()
                .optional()
                .describe(
                    'Two-letter storefront code. It decides price, currency, localised title and whether the app is sold there at all. Anything that is not exactly two letters silently falls back to us. Default: us.'
                ),
            entity: z
                .enum(['software', 'ipad_software', 'mac_software'])
                .optional()
                .describe('Which App Store catalogue to search. Options: software, ipad_software, mac_software. Default: software.'),
            lang: z
                .string()
                .optional()
                .describe('Five-letter locale, e.g. en_us. Independent of country: the storefront sets the price, this sets the words.')
        })
    ),
    endpoint(
        'app',
        'App Store App',
        'scavio_app_store_app',
        '/api/v1/appstore/app',
        1,
        'Full App Store listing: title, description, developer identity, price, all-time and current-version ratings, release notes, genres, advisories, screenshots, size, minimum OS, supported devices.',
        z.object({
            app_id: z
                .string()
                .describe(
                    'Numeric App Store id OR a bundle id (notion.id, com.burbn.instagram). A pasted apps.apple.com URL is rejected with a free 400.'
                ),
            country: z
                .string()
                .optional()
                .describe(
                    'Two-letter storefront code. It decides price, currency, localised title and whether the app is sold there at all. Anything that is not exactly two letters silently falls back to us. Default: us.'
                )
        })
    ),
    endpoint(
        'reviews',
        'App Store Reviews',
        'scavio_app_store_reviews',
        '/api/v1/appstore/reviews',
        1,
        "A page of App Store reviews: star rating, title, full text, author, and the APP VERSION it was written against. Pagination: page 1..10 at 50 per page -- a HARD STOP at page 10 (500 reviews per storefront is Apple's anonymous ceiling). Reach further by asking a different `country`.",
        z.object({
            app_id: z.string().describe('Numeric App Store id. NUMERIC ONLY here -- the reviews feed has no bundle-id form.'),
            country: z
                .string()
                .optional()
                .describe(
                    'Two-letter storefront code. It decides price, currency, localised title and whether the app is sold there at all. Anything that is not exactly two letters silently falls back to us. Default: us.'
                ),
            page: z
                .number()
                .int()
                .optional()
                .describe(
                    'Result page, 1-10, at 50 reviews each. Apple hard-stops at page 10; reach further by asking a different country. Default: 1.'
                ),
            sort: z
                .enum(['most_recent', 'most_helpful'])
                .optional()
                .describe(
                    'Review sort order. Under most_recent almost every review is too new to have been voted on, so the vote fields come back as zeroes. Options: most_recent, most_helpful. Default: most_recent.'
                )
        })
    )
]

/* -------------------------------------------------------------------------- */
/* Google Play - 3 endpoints                                                  */
/* -------------------------------------------------------------------------- */

export const GOOGLE_PLAY_ENDPOINTS: ScavioEndpoint[] = [
    endpoint(
        'search',
        'Google Play Search',
        'scavio_google_play_search',
        '/api/v1/googleplay/search',
        2,
        'Ranked Google Play apps: package name, title, developer, rating, install count, price and IAP range, content rating, icon, screenshots.',
        z.object({
            query: z.string().describe('Search query. There is no pagination -- one shelf of ~30 apps.'),
            hl: z
                .string()
                .optional()
                .describe(
                    'Interface language. It moves the whole storefront, not only the strings: title, description, install formatting and content rating all follow it. Default: en.'
                ),
            gl: z.string().optional().describe('Storefront country code. Default: us.')
        })
    ),
    endpoint(
        'app',
        'Google Play App',
        'scavio_google_play_app',
        '/api/v1/googleplay/app',
        2,
        'Full Google Play store listing: installs (incl. the REAL unrendered count), star histogram, developer identity, IAPs, permission tree, Data safety table, the 20 server-rendered reviews.',
        z.object({
            app_id: z.string().describe('Android package name, or any play.google.com URL carrying one in its id parameter.'),
            hl: z
                .string()
                .optional()
                .describe(
                    'Interface language. It moves the whole storefront, not only the strings: title, description, install formatting and content rating all follow it. Default: en.'
                ),
            gl: z.string().optional().describe('Storefront country code. Default: us.')
        })
    ),
    endpoint(
        'reviews',
        'Google Play Reviews',
        'scavio_google_play_reviews',
        '/api/v1/googleplay/reviews',
        2,
        'A page of Google Play reviews: star score, full text, author, thumbs-up count, developer reply, and the APP VERSION the reviewer was running. Pagination: cursor -> next_cursor. The cursor is OPAQUE, SINGLE-USE, and encodes the SORT as well as the position -- send it back with the SAME `sort` it came from. A cursor past the last review is a 404, not an empty page.',
        z.object({
            app_id: z.string().describe('Android package name, or any play.google.com URL carrying one in its id parameter.'),
            sort: z
                .enum(['relevance', 'newest', 'rating'])
                .optional()
                .describe('Review sort order. Options: relevance, newest, rating. Default: newest.'),
            count: z.number().int().optional().describe('Reviews to return, 1-200. Default: 50.'),
            cursor: z
                .string()
                .optional()
                .describe(
                    'next_cursor from a previous response. OPAQUE and SINGLE-USE, and it encodes the sort as well as the position -- send it back with the SAME sort it came from. A cursor past the last review is a 404.'
                ),
            hl: z
                .string()
                .optional()
                .describe(
                    'Interface language. It moves the whole storefront, not only the strings: title, description, install formatting and content rating all follow it. Default: en.'
                ),
            gl: z.string().optional().describe('Storefront country code. Default: us.')
        })
    )
]

/* -------------------------------------------------------------------------- */
/* SEC EDGAR - 6 endpoints                                                    */
/* -------------------------------------------------------------------------- */

export const SEC_ENDPOINTS: ScavioEndpoint[] = [
    endpoint(
        'lookup',
        'SEC Lookup',
        'scavio_sec_lookup',
        '/api/v1/sec/lookup',
        1,
        'START HERE. Resolve a company name or ticker (AAPL) to the CIK (0000320193) every other SEC EDGAR endpoint is keyed by.',
        z.object({
            query: z.string().describe('Ticker, company name, or a fragment of either.'),
            limit: z.number().int().optional().describe('Maximum filers to return, 1-100. Default: 10.'),
            exchange: z
                .string()
                .optional()
                .describe(
                    'Listing exchange filter, matched case-insensitively. Filers listed with no exchange are excluded by any value. Options: NASDAQ, NYSE, OTC, CBOE.'
                )
        })
    ),
    endpoint(
        'company',
        'SEC Company',
        'scavio_sec_company',
        '/api/v1/sec/company',
        1,
        'SEC filer profile: legal and former names, SIC industry, EIN, LEI, state of incorporation, fiscal year end, addresses, every ticker, and a preview of its 10 most recent filings.',
        z.object({
            cik: z.string().optional().describe('Central Index Key: 320193, 0000320193 or CIK0000320193. A ticker is accepted here too.'),
            ticker: z.string().optional().describe('Stock ticker, dotted or dashed (BRK.B / BRK-B). WINS over cik when both are given.')
        })
    ),
    endpoint(
        'filings',
        'SEC Filings',
        'scavio_sec_filings',
        '/api/v1/sec/filings',
        1,
        "A page of one filer's filings: accession number, form and root form, filing and period dates, 8-K item codes, direct document links. Pagination: page + limit.",
        z.object({
            cik: z.string().optional().describe('Central Index Key: 320193, 0000320193 or CIK0000320193. A ticker is accepted here too.'),
            ticker: z.string().optional().describe('Stock ticker, dotted or dashed (BRK.B / BRK-B). WINS over cik when both are given.'),
            form: z
                .union([z.string(), z.array(z.string())])
                .optional()
                .describe(
                    'Form filter: "10-K", ["10-K", "10-Q"] or "10-K,8-K". Matched against the form AND its root form, so 10-K also returns 10-K/A amendments.'
                ),
            date_from: z.string().optional().describe('Earliest date to include, YYYY-MM-DD.'),
            date_to: z.string().optional().describe('Latest date to include, YYYY-MM-DD.'),
            page: z.number().int().optional().describe('Result page number, 1-based.'),
            limit: z.number().int().optional().describe('Filings to return, 1-500. Default: 50.'),
            include_history: z
                .boolean()
                .optional()
                .describe(
                    'Also read the archived filing shards (up to 10). Still one credit; history_truncated flags a filer that had more. Default: False.'
                )
        })
    ),
    endpoint(
        'concept',
        'SEC Concept',
        'scavio_sec_concept',
        '/api/v1/sec/concept',
        1,
        'Every value a filer reported for one XBRL concept, newest period first, with the form and filing each number came from.',
        z.object({
            cik: z.string().optional().describe('Central Index Key: 320193, 0000320193 or CIK0000320193. A ticker is accepted here too.'),
            ticker: z.string().optional().describe('Stock ticker, dotted or dashed (BRK.B / BRK-B). WINS over cik when both are given.'),
            concept: z
                .string()
                .describe(
                    "XBRL tag, CASE-SENSITIVE: 'netincomeloss' is a 404 upstream, not a match. Use the facts endpoint to list what a filer actually reports."
                ),
            taxonomy: z.string().optional().describe('XBRL taxonomy: us-gaap, dei, ifrs-full or srt. Default: us-gaap.'),
            unit: z.string().optional().describe('Unit of measure to filter on, e.g. USD or USD/shares.'),
            form: z.string().optional().describe("Form filter. EXACT match here, so '10-K' excludes 10-K/A."),
            limit: z.number().int().optional().describe('Values to return, 1-2000. Default: 250.')
        })
    ),
    endpoint(
        'facts',
        'SEC Facts',
        'scavio_sec_facts',
        '/api/v1/sec/facts',
        1,
        'The index of every XBRL concept a filer reports -- tag, label, description, units, most recent value. This is how you find what to ask /sec/concept for.',
        z.object({
            cik: z.string().optional().describe('Central Index Key: 320193, 0000320193 or CIK0000320193. A ticker is accepted here too.'),
            ticker: z.string().optional().describe('Stock ticker, dotted or dashed (BRK.B / BRK-B). WINS over cik when both are given.'),
            taxonomy: z.string().optional().describe('Restrict the index to one XBRL taxonomy.'),
            query: z.string().optional().describe('Case-insensitive substring matched against the tag name and its label.'),
            limit: z.number().int().optional().describe('Concepts to return, 1-2000. Default: 250.')
        })
    ),
    endpoint(
        'search',
        'SEC Search',
        'scavio_sec_search',
        '/api/v1/sec/search',
        1,
        'EDGAR full-text search, 2001-today: each hit is the matching DOCUMENT with its URL, form, filing date and filer identity, plus facets by company, form, industry and state. Pagination: page -- capped at 100 (100 docs/page) because the index refuses a result window past 10,000.',
        z.object({
            query: z
                .string()
                .optional()
                .describe(
                    'Full-text query. A quoted phrase is exact, bare words are a bag of terms. Optional -- a cik, form or date filter on its own is a valid search.'
                ),
            cik: z
                .union([z.string(), z.array(z.string())])
                .optional()
                .describe('One CIK or a list of them. Tickers are accepted here too.'),
            ticker: z
                .union([z.string(), z.array(z.string())])
                .optional()
                .describe('One ticker or a list of them.'),
            form: z
                .union([z.string(), z.array(z.string())])
                .optional()
                .describe('One form type or a list of them.'),
            date_from: z.string().optional().describe('Earliest filing date, YYYY-MM-DD. Coverage starts 2001.'),
            date_to: z.string().optional().describe('Latest date to include, YYYY-MM-DD.'),
            location: z
                .union([z.string(), z.array(z.string())])
                .optional()
                .describe("EDGAR's own jurisdiction codes: CA, NY, and alphanumeric codes for foreign jurisdictions. One code or a list."),
            sort: z
                .enum(['relevance', 'newest', 'oldest'])
                .optional()
                .describe('Sort order for the results. Options: relevance, newest, oldest. Default: relevance.'),
            page: z
                .number()
                .int()
                .optional()
                .describe('Result page, 1-100, at 100 documents each. The index refuses a result window past 10,000.')
        })
    )
]

/* -------------------------------------------------------------------------- */
/* Redfin - 3 endpoints                                                       */
/* -------------------------------------------------------------------------- */

export const REDFIN_ENDPOINTS: ScavioEndpoint[] = [
    endpoint(
        'search',
        'Redfin Search',
        'scavio_redfin_search',
        '/api/v1/redfin/search',
        1,
        'Redfin listings: price, price per sqft, beds, baths, living area, lot size, year built, coordinates, listing remarks, full photo galleries. Pagination: page + limit -- up to 350 per page.',
        z.object({
            location: z
                .string()
                .optional()
                .describe(
                    'A redfin.com region URL (/city/, /neighborhood/, /county/, /zipcode/) or a bare 5-digit ZIP. CITY NAMES ARE NOT ACCEPTED.'
                ),
            region_id: z
                .number()
                .int()
                .optional()
                .describe(
                    "Redfin's own numeric region id. NOT a ZIP code -- different number spaces, and a ZIP here resolves to another city rather than failing. Must be sent together with region_type."
                ),
            region_type: z
                .union([z.literal(1), z.literal(2), z.literal(5), z.literal(6)])
                .optional()
                .describe(
                    'What region_id refers to: 1 neighborhood, 2 ZIP, 5 county, 6 city. Must be sent together with region_id. Options: 1, 2, 5, 6.'
                ),
            listing_status: z
                .enum(['for_sale', 'sold', 'for_rent'])
                .optional()
                .describe('Which listing state to return. Options: for_sale, sold, for_rent. Default: for_sale.'),
            sold_within_days: z
                .number()
                .int()
                .optional()
                .describe(
                    'How far back to look for sold homes. Only valid with listing_status=sold, where it defaults to 90. Default: 90.'
                ),
            page: z.number().int().optional().describe('Result page number, 1-based.'),
            limit: z.number().int().optional().describe('Listings per page, 1-350. Default: 100.'),
            sort: z
                .enum([
                    'recommended',
                    'price_low',
                    'price_high',
                    'newest',
                    'oldest',
                    'sqft_low',
                    'sqft_high',
                    'price_per_sqft_low',
                    'price_per_sqft_high'
                ])
                .optional()
                .describe(
                    'Sort order for the results. Options: recommended, price_low, price_high, newest, oldest, sqft_low, sqft_high, price_per_sqft_low, price_per_sqft_high. Default: recommended.'
                ),
            min_price: z.number().optional().describe('Minimum price. On listing_status=for_rent this means MONTHLY RENT.'),
            max_price: z.number().optional().describe('Maximum price. On listing_status=for_rent this means MONTHLY RENT.'),
            beds_min: z.number().int().optional().describe('Minimum number of bedrooms.'),
            beds_max: z.number().int().optional().describe('Maximum number of bedrooms.'),
            baths_min: z
                .number()
                .int()
                .optional()
                .describe('Minimum number of bathrooms. WHOLE baths only -- fractional bounds are rejected because Redfin truncates them.'),
            sqft_min: z.number().int().optional().describe('Minimum living area in square feet.'),
            sqft_max: z.number().int().optional().describe('Maximum living area in square feet.'),
            lot_size_min: z.number().int().optional().describe('Minimum lot size in square feet.'),
            year_built_min: z.number().int().optional().describe('Earliest year built.'),
            year_built_max: z.number().int().optional().describe('Latest year built.'),
            max_hoa: z.number().optional().describe('Maximum monthly HOA fee.'),
            property_type: z
                .enum(['house', 'condo', 'townhouse', 'multi_family', 'land', 'other', 'co_op'])
                .optional()
                .describe('Property type filter. Options: house, condo, townhouse, multi_family, land, other, co_op.'),
            has_pool: z.boolean().optional().describe('Only return properties with a pool.'),
            max_days_on_market: z
                .number()
                .int()
                .optional()
                .describe(
                    'Maximum days on market. Cannot be combined with min_days_on_market: Redfin expresses both through one parameter.'
                ),
            min_days_on_market: z.number().int().optional().describe('Minimum days on market. Cannot be combined with max_days_on_market.')
        })
    ),
    endpoint(
        'property',
        'Redfin Property',
        'scavio_redfin_property',
        '/api/v1/redfin/property',
        1,
        'One Redfin listing in full: price, Redfin Estimate and rental estimate, complete MLS fact sheet, price and tax history, agents, schools, climate risk, comparable sales, photos.',
        z.object({
            property_id: z.string().describe('Redfin property id or any redfin.com listing URL carrying one.')
        })
    ),
    endpoint(
        'market',
        'Redfin Market',
        'scavio_redfin_market',
        '/api/v1/redfin/market',
        1,
        'Redfin housing-market stats for a region: median list and sale price, price per sqft, sale-to-list ratio, average offers and days on market, YoY movement, 0-100 compete score, live inventory.',
        z.object({
            location: z
                .string()
                .optional()
                .describe(
                    'A redfin.com region URL (/city/, /neighborhood/, /county/, /zipcode/) or a bare 5-digit ZIP. CITY NAMES ARE NOT ACCEPTED.'
                ),
            region_id: z
                .number()
                .int()
                .optional()
                .describe(
                    "Redfin's own numeric region id. NOT a ZIP code -- different number spaces, and a ZIP here resolves to another city rather than failing. Must be sent together with region_type."
                ),
            region_type: z
                .union([z.literal(1), z.literal(2), z.literal(5), z.literal(6)])
                .optional()
                .describe(
                    'What region_id refers to: 1 neighborhood, 2 ZIP, 5 county, 6 city. Must be sent together with region_id. Options: 1, 2, 5, 6.'
                )
        })
    )
]

/* -------------------------------------------------------------------------- */
/* Companies House - 4 endpoints                                              */
/* -------------------------------------------------------------------------- */

export const COMPANIES_HOUSE_ENDPOINTS: ScavioEndpoint[] = [
    endpoint(
        'search',
        'Companies House Search',
        'scavio_companies_house_search',
        '/api/v1/companieshouse/search',
        1,
        'START HERE. Search the UK register by name and get the company_number every other endpoint is keyed by, plus status, incorporation date and registered office. Pagination: page -- 20 per page, CAPPED AT PAGE 50. The register serves a 1000-result WINDOW per term whatever hit count it prints (it claims 10,000 for a broad term then answers page 51 with HTTP 416).',
        z.object({
            query: z.string().describe('Company name or number. Matches CURRENT AND FORMER names.'),
            page: z
                .number()
                .int()
                .optional()
                .describe(
                    'Result page, 1-50, at 20 rows each. Capped at 50 because the register only serves the first 1000 matches per term whatever hit count it prints. Default: 1.'
                )
        })
    ),
    endpoint(
        'company',
        'Companies House Company',
        'scavio_companies_house_company',
        '/api/v1/companieshouse/company',
        1,
        'Full UK register entry: status, type, incorporation and dissolution dates, registered office, SIC codes, previous names, accounts and confirmation-statement due dates with overdue flags.',
        z.object({
            company_number: z
                .string()
                .describe(
                    'Company number. Zero-padded and upper-cased for you, so numbers off a letterhead or a spreadsheet that ate leading zeros still resolve. SC, NI, OC, SO, NC, FC, BR and CE prefixes are supported.'
                )
        })
    ),
    endpoint(
        'officers',
        'Companies House Officers',
        'scavio_companies_house_officers',
        '/api/v1/companieshouse/officers',
        1,
        'UK company officers current and resigned: name, role, appointment and resignation dates, correspondence address, nationality, month-and-year DOB, identity-verification status. Pagination: page -- 35 per page, NO upper page bound. Past the last page the register answers an ordinary 200 with an empty list, identical to a company with no officers.',
        z.object({
            company_number: z
                .string()
                .describe(
                    'Company number. Zero-padded and upper-cased for you, so numbers off a letterhead or a spreadsheet that ate leading zeros still resolve. SC, NI, OC, SO, NC, FC, BR and CE prefixes are supported.'
                ),
            page: z
                .number()
                .int()
                .optional()
                .describe(
                    'Result page, 1-based, 35 officers per page. No upper bound: past the last page the register answers a plain 200 with an empty list. Default: 1.'
                )
        })
    ),
    endpoint(
        'filingHistory',
        'Companies House Filing-History',
        'scavio_companies_house_filing_history',
        '/api/v1/companieshouse/filing-history',
        1,
        'UK filings, most recent first: date, filing type code (AA, CS01, SH03), description, register annotations and child documents, link to the filed PDF with page count. Pagination: page -- NO upper page bound; past the last page it is an ordinary 200 with an empty list.',
        z.object({
            company_number: z
                .string()
                .describe(
                    'Company number. Zero-padded and upper-cased for you, so numbers off a letterhead or a spreadsheet that ate leading zeros still resolve. SC, NI, OC, SO, NC, FC, BR and CE prefixes are supported.'
                ),
            page: z
                .number()
                .int()
                .optional()
                .describe(
                    'Result page, 1-based. No upper bound: past the last page the register answers a plain 200 with an empty list. Default: 1.'
                )
        })
    )
]

/* -------------------------------------------------------------------------- */
/* G2 - 3 endpoints                                                           */
/* -------------------------------------------------------------------------- */

export const G2_ENDPOINTS: ScavioEndpoint[] = [
    endpoint(
        'search',
        'G2 Search',
        'scavio_g2_search',
        '/api/v1/g2/search',
        5,
        'Search G2 for B2B software products: star rating, review count, vendor, categories, seller description, logo; each row carries product_id and slug. Pagination: page + limit -- `limit` capped at 100 on our side; G2 itself keeps paginating at any size.',
        z.object({
            query: z.string().optional().describe('Software product or category to search for.'),
            page: z.number().int().optional().describe('Result page, 1-based. 20 per page unless limit says otherwise.'),
            limit: z
                .number()
                .int()
                .optional()
                .describe('Products per page, 1-100. Capped at 100 so one request cannot ask for a multi-megabyte page. Default: 20.'),
            sort: z
                .enum(['relevance', 'popular', 'alphabetical', 'rating'])
                .optional()
                .describe('Sort order for the results. Options: relevance, popular, alphabetical, rating. Default: relevance.'),
            rating: z
                .union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)])
                .optional()
                .describe('Only return products at or above this star rating. Options: 1, 2, 3, 4, 5.'),
            url: z.string().optional().describe('Full g2.com/search URL, usable instead of query.')
        })
    ),
    endpoint(
        'product',
        'G2 Product',
        'scavio_g2_product',
        '/api/v1/g2/product',
        5,
        "Full G2 software profile: rating and per-star histogram, vendor, pricing editions with parsed amounts, feature groups, integrations, alternatives, comparisons, and G2's AI-derived pros and cons.",
        z.object({
            product_id: z
                .string()
                .optional()
                .describe('G2 slug (notion) or the numeric G2 id (82623) as a string. Both resolve on the same upstream path.'),
            url: z.string().optional().describe('Full listing URL, usable instead of the id fields.')
        })
    ),
    endpoint(
        'reviews',
        'G2 Reviews',
        'scavio_g2_reviews',
        '/api/v1/g2/reviews',
        5,
        "A page of G2 software reviews: rating, title, likes/dislikes, problems solved, reviewer job title, industry and company size, validated/incentivized flags -- PLUS exact per-star counts and faceted counts. Pagination: page -- fixed at 10 per page and paginates well past the 10 pages G2's own widget links to.",
        z.object({
            product_id: z
                .string()
                .optional()
                .describe('G2 slug (notion) or the numeric G2 id (82623) as a string. Both resolve on the same upstream path.'),
            url: z.string().optional().describe('Full listing URL, usable instead of the id fields.'),
            page: z
                .number()
                .int()
                .optional()
                .describe(
                    "Result page, 1-based. Fixed at 10 reviews per page, and it paginates well past the 10 pages G2's own widget links to."
                ),
            sort: z
                .enum(['relevance', 'newest', 'most_helpful', 'rating_high', 'rating_low'])
                .optional()
                .describe(
                    'Sort order. Closed set: an unknown value is silently accepted upstream and the sort never runs. Options: relevance, newest, most_helpful, rating_high, rating_low. Default: relevance.'
                ),
            rating: z
                .union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)])
                .optional()
                .describe('Star bucket. HALF-STAR-INCLUSIVE: 1 returns 0, 0.5 and 1-star reviews. Options: 1, 2, 3, 4, 5.'),
            company_size: z
                .enum(['small_business', 'mid_market', 'enterprise'])
                .optional()
                .describe(
                    'Reviewer company size: small_business (<=50), mid_market (51-1000), enterprise (>1000). Options: small_business, mid_market, enterprise.'
                ),
            role: z
                .enum(['user', 'administrator', 'executive_sponsor', 'internal_consultant', 'consultant', 'agency', 'industry_analyst'])
                .optional()
                .describe(
                    'Reviewer role filter. Options: user, administrator, executive_sponsor, internal_consultant, consultant, agency, industry_analyst.'
                ),
            region: z
                .enum(['north_america', 'europe', 'asia', 'latin_america', 'anz', 'middle_east', 'africa'])
                .optional()
                .describe('Reviewer region filter. Options: north_america, europe, asia, latin_america, anz, middle_east, africa.'),
            query: z.string().optional().describe('Full-text search inside the reviews. Narrows the list AND every facet count.')
        })
    )
]

/* -------------------------------------------------------------------------- */
/* Capterra - 3 endpoints                                                     */
/* -------------------------------------------------------------------------- */

export const CAPTERRA_ENDPOINTS: ScavioEndpoint[] = [
    endpoint(
        'search',
        'Capterra Search',
        'scavio_capterra_search',
        '/api/v1/capterra/search',
        2,
        'Search Capterra for B2B software: 20 ranked products with name, vendor description, rating, review count, logo, paid-placement flag; each row carries product_id and slug.',
        z.object({
            query: z
                .string()
                .optional()
                .describe(
                    'Software product or category. Required unless you pass a url: a term-less search serves a fixed popular-products list that has nothing to do with the caller.'
                ),
            url: z.string().optional().describe('Full capterra.com/search URL. capterra.co.uk and capterra.com.br are accepted.')
        })
    ),
    endpoint(
        'product',
        'Capterra Product',
        'scavio_capterra_product',
        '/api/v1/capterra/product',
        2,
        'Full Capterra profile: per-star histogram and the four scored criteria, complete pricing table, every rated feature and integration, AI pros/cons with the quoted review, buyer profile, PLUS the 25 most recent reviews.',
        z.object({
            product_id: z.string().optional().describe('The number in /p/186596/Notion/, as a STRING -- a JSON number is rejected.'),
            slug: z.string().optional().describe("Product slug. Cosmetic here: /p/186596/Zzzjunk/ returns Notion's profile byte for byte."),
            url: z.string().optional().describe('Full listing URL, usable instead of the id fields.')
        })
    ),
    endpoint(
        'reviews',
        'Capterra Reviews',
        'scavio_capterra_reviews',
        '/api/v1/capterra/reviews',
        2,
        'A page of Capterra reviews: overall score plus five per-criterion scores, pros, cons, advice, usage duration, alternatives considered, vendor response -- plus a rich competitor list with rating histograms and starting prices. Pagination: page -- 25 per page, capped at page 100 (CAPTERRA_MAX_REVIEW_PAGE); past it Capterra answers 200 with PAGE ONE and the page quietly dropped from the canonical.',
        z.object({
            product_id: z.string().optional().describe('The number in /p/186596/Notion/, as a STRING -- a JSON number is rejected.'),
            slug: z
                .string()
                .optional()
                .describe(
                    'Product slug. LOAD-BEARING here: it is case-sensitive upstream and a wrong one silently serves PAGE ONE under a billed 200. Pass back the slug from search or product.'
                ),
            url: z.string().optional().describe('Passing back reviews_url from the product endpoint is the reliable way to page.'),
            page: z
                .number()
                .int()
                .optional()
                .describe('Result page, 1-100, at 25 reviews each. Past page 100 Capterra answers 200 with page ONE.')
        })
    )
]

/* -------------------------------------------------------------------------- */
/* Google Ads Transparency - 3 endpoints                                      */
/* -------------------------------------------------------------------------- */

export const GOOGLE_ADS_ENDPOINTS: ScavioEndpoint[] = [
    endpoint(
        'search',
        'Google Ads Search',
        'scavio_google_ads_search',
        '/api/v1/googleads/search',
        1,
        'Every ad Google is running for one advertiser: the creative, advertiser id and name, format, first/last seen dates, days actually run, plus total_ads_min/total_ads_max. Pagination: cursor -> next_cursor, 100 creatives per page. Re-send the SAME filters alongside the cursor.',
        z.object({
            domain: z
                .string()
                .optional()
                .describe(
                    'Advertiser website: bare host, www host or full URL, reduced to the registrable host. This is the ONLY way to get the `domain` field back on each row.'
                ),
            advertiser_id: z
                .string()
                .optional()
                .describe(
                    'Google advertiser id, e.g. AR16735076323512287233. The shape is checked before any request, so a typo costs nothing.'
                ),
            region: z
                .string()
                .optional()
                .describe(
                    'ISO alpha-2 country (US, GB, DE) or a Google geo criteria id as a string. It also scopes the deep links on every row. Default: worldwide.'
                ),
            format: z
                .enum(['text', 'image', 'video'])
                .optional()
                .describe(
                    "Creative format. The three sets are DISJOINT -- an advertiser's text, image and video ads share no creatives. Default: all formats. Options: text, image, video."
                ),
            platform: z
                .enum(['play', 'maps', 'search', 'shopping', 'youtube'])
                .optional()
                .describe('Surface the ad ran on. Default: all surfaces. Options: play, maps, search, shopping, youtube.'),
            topic: z.enum(['all', 'political']).optional().describe('Ad topic filter. Options: all, political. Default: all.'),
            limit: z
                .number()
                .int()
                .optional()
                .describe(
                    'Creatives per page, 1-100. 100 is a HARD UPSTREAM CEILING, not our policy: Google answers a larger request with ZERO rows rather than an error. Default: 40.'
                ),
            cursor: z
                .string()
                .optional()
                .describe(
                    'next_cursor from the previous response. Re-send the SAME filters alongside it. Null once the result set is exhausted.'
                )
        })
    ),
    endpoint(
        'advertisers',
        'Google Ads Advertisers',
        'scavio_google_ads_advertisers',
        '/api/v1/googleads/advertisers',
        1,
        'START HERE. Resolve a brand name or domain to the advertiser_id /search and /creative are keyed by. Returns `advertiser` rows (id, verified name, verification country, total ad count as a RANGE) and `domain` rows.',
        z.object({
            query: z.string().describe('Advertiser name or domain to resolve.'),
            region: z
                .string()
                .optional()
                .describe(
                    'ISO alpha-2 country (US, GB, DE) or a Google geo criteria id as a string. It also scopes the deep links on every row. Default: worldwide.'
                ),
            limit: z
                .number()
                .int()
                .optional()
                .describe(
                    'Rows per arm, 1-20. Advertisers and domains are capped separately, so a name query can return up to twice this many rows. Default: 10.'
                )
        })
    ),
    endpoint(
        'creative',
        'Google Ads Creative',
        'scavio_google_ads_creative',
        '/api/v1/googleads/creative',
        1,
        'One Google ad creative in full and the ONLY endpoint carrying its history: every size variation, the impression bucket, the per-region breakdown with first/last shown dates and a per-surface impression split, and the funder disclosure on political ads.',
        z.object({
            advertiser_id: z.string().describe('Google advertiser id owning the creative.'),
            creative_id: z
                .string()
                .describe(
                    'Creative id. It must belong to the advertiser_id sent with it -- the lookup is keyed by the pair and a mismatch is a 404.'
                )
        })
    )
]

/* -------------------------------------------------------------------------- */
/* Meta Ad Library - 3 endpoints                                              */
/* -------------------------------------------------------------------------- */

export const META_ADS_ENDPOINTS: ScavioEndpoint[] = [
    endpoint(
        'search',
        'Meta Ads Search',
        'scavio_meta_ads_search',
        '/api/v1/meta-ads/search',
        1,
        'Search the Meta Ad Library: 30 ads on page 1 with full creative (page name, ad copy, headline, CTA, images and videos, platforms, run dates), then cursor-paginated. Pagination: cursor -> next_cursor. Page 1 is 30 ads, then 10 per page; walk has_next_page to read a whole query.',
        z.object({
            query: z.string().describe('Keyword, brand or advertiser name to search the library for.'),
            country: z.string().optional().describe('Two-letter country code for the ad library storefront. Default: US.'),
            active_status: z
                .enum(['all', 'active', 'inactive'])
                .optional()
                .describe('Whether to return running, stopped or all ads. Options: all, active, inactive. Default: all.'),
            ad_type: z
                .enum(['all', 'political_and_issue_ads'])
                .optional()
                .describe(
                    'Set to political_and_issue_ads to expose spend, reach, impressions and the paid-for-by disclosure. Commercial ads leave those null. Options: all, political_and_issue_ads. Default: all.'
                ),
            media_type: z
                .enum(['all', 'image', 'video', 'meme', 'image_and_meme', 'none'])
                .optional()
                .describe('Creative media type filter. Options: all, image, video, meme, image_and_meme, none.'),
            search_type: z
                .enum(['keyword_unordered', 'keyword_exact_phrase'])
                .optional()
                .describe(
                    'Whether the query is matched as an exact phrase. Options: keyword_unordered, keyword_exact_phrase. Default: keyword_unordered.'
                ),
            cursor: z
                .string()
                .optional()
                .describe(
                    'next_cursor from the previous response. Page 1 is 30 ads, then 10 per page. ALL OTHER FILTERS ARE IGNORED when a cursor is present -- the cursor already carries them.'
                )
        })
    ),
    endpoint(
        'advertiser',
        'Meta Ads Advertiser',
        'scavio_meta_ads_advertiser',
        '/api/v1/meta-ads/advertiser',
        1,
        'Every ad a Facebook Page is running, by numeric page id -- 30 ads on page 1 with the same creative detail as search, cursor-paginated at 10 per page thereafter. Pagination: cursor -> next_cursor; page 1 = 30 ads, then 10 per page. Walk has_next_page.',
        z.object({
            page_id: z.string().describe("The advertiser's numeric Facebook Page id."),
            country: z.string().optional().describe('Two-letter country code for the ad library storefront. Default: US.'),
            active_status: z
                .enum(['all', 'active', 'inactive'])
                .optional()
                .describe('Whether to return running, stopped or all ads. Options: all, active, inactive. Default: all.'),
            ad_type: z
                .enum(['all', 'political_and_issue_ads'])
                .optional()
                .describe(
                    'Set to political_and_issue_ads to expose spend, reach, impressions and the paid-for-by disclosure. Commercial ads leave those null. Options: all, political_and_issue_ads. Default: all.'
                ),
            media_type: z
                .enum(['all', 'image', 'video', 'meme', 'image_and_meme', 'none'])
                .optional()
                .describe('Creative media type filter. Options: all, image, video, meme, image_and_meme, none.'),
            cursor: z.string().optional().describe('next_cursor from the previous response. Page 1 is 30 ads, then 10 per page.')
        })
    ),
    endpoint(
        'ad',
        'Meta Ads Ad',
        'scavio_meta_ads_ad',
        '/api/v1/meta-ads/ad',
        1,
        'One Meta ad in full by archive id: creative, advertiser, run dates, platforms, any political disclosure.',
        z.object({
            ad_archive_id: z.string().describe("The ad's numeric archive id.")
        })
    )
]

/* -------------------------------------------------------------------------- */
/* Extract (any URL) - 1 endpoint                                             */
/* -------------------------------------------------------------------------- */

export const EXTRACT_ENDPOINTS: ScavioEndpoint[] = [
    endpoint(
        'extract',
        'Extract',
        'scavio_extract',
        '/api/v1/extract',
        1,
        'Read ANY URL and get it back as raw HTML, readability Markdown, or plain text. The read-a-page primitive: { url, format, mode, content, content_length }.',
        z.object({
            url: z
                .string()
                .describe(
                    'Page to read. http(s) only; a bare host is upgraded to https. Loopback, private, link-local and metadata hosts are rejected with a 400.'
                ),
            format: z
                .enum(['html', 'markdown', 'text'])
                .optional()
                .describe(
                    'Output format: html is the raw page, markdown is a readability extraction, text is that markdown flattened to plain text. Options: html, markdown, text. Default: markdown.'
                ),
            mode: z
                .enum(['normal', 'advanced', 'ultra'])
                .optional()
                .describe(
                    'Fetch tier and THE PRICE-BEARING PARAMETER: normal and advanced cost 1 credit, ultra costs 2. Escalate only when a plain fetch comes back empty. Options: normal, advanced, ultra. Default: normal.'
                )
        }),
        undefined,
        'Costs 1 credit in normal or advanced mode and 2 credits in ultra mode, and is billed only on a successful extraction.'
    )
]

/* -------------------------------------------------------------------------- */
/* Platform registry                                                           */
/* -------------------------------------------------------------------------- */

export const SCAVIO_ENDPOINTS: Record<string, ScavioEndpoint[]> = {
    google: GOOGLE_ENDPOINTS,
    youtube: YOUTUBE_ENDPOINTS,
    amazon: AMAZON_ENDPOINTS,
    reddit: REDDIT_ENDPOINTS,
    tiktok: TIKTOK_ENDPOINTS,
    tiktokShop: TIKTOK_SHOP_ENDPOINTS,
    instagram: INSTAGRAM_ENDPOINTS,
    x: X_ENDPOINTS,
    linkedin: LINKEDIN_ENDPOINTS,
    walmart: WALMART_ENDPOINTS,
    threads: THREADS_ENDPOINTS,
    kuaishou: KUAISHOU_ENDPOINTS,
    ebay: EBAY_ENDPOINTS,
    target: TARGET_ENDPOINTS,
    homeDepot: HOME_DEPOT_ENDPOINTS,
    zillow: ZILLOW_ENDPOINTS,
    booking: BOOKING_ENDPOINTS,
    tripadvisor: TRIPADVISOR_ENDPOINTS,
    indeed: INDEED_ENDPOINTS,
    airbnb: AIRBNB_ENDPOINTS,
    glassdoor: GLASSDOOR_ENDPOINTS,
    yelp: YELP_ENDPOINTS,
    appStore: APP_STORE_ENDPOINTS,
    googlePlay: GOOGLE_PLAY_ENDPOINTS,
    sec: SEC_ENDPOINTS,
    redfin: REDFIN_ENDPOINTS,
    companiesHouse: COMPANIES_HOUSE_ENDPOINTS,
    g2: G2_ENDPOINTS,
    capterra: CAPTERRA_ENDPOINTS,
    googleAds: GOOGLE_ADS_ENDPOINTS,
    metaAds: META_ADS_ENDPOINTS,
    extract: EXTRACT_ENDPOINTS
}

/** Build the multiOptions list for a platform straight from the endpoint table, so the UI can never drift from the API. */
export const toNodeOptions = (endpoints: ScavioEndpoint[]): INodeOptionsValue[] =>
    endpoints.map((e) => ({
        label: e.label,
        name: e.action,
        description: describeCost(e.path, e.credits, e.creditNote)
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
