// import { SerpAPI } from '@langchain/community/tools/serpapi'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'

import { getEnvironmentVariable } from '@langchain/core/utils/env'
import { Tool } from '@langchain/core/tools'

/**
 * This does not use the `serpapi` package because it appears to cause issues
 * when used in `jest` tests. Part of the issue seems to be that the `serpapi`
 * package imports a wasm module to use instead of native `fetch`, which we
 * don't want anyway.
 *
 * NOTE: you must provide location, gl and hl or your region and language will
 * may not match your location, and will not be deterministic.
 */

// Copied over from `serpapi` package
interface BaseParameters {
    /**
     * Parameter defines the device to use to get the results. It can be set to
     * `desktop` (default) to use a regular browser, `tablet` to use a tablet browser
     * (currently using iPads), or `mobile` to use a mobile browser (currently
     * using iPhones).
     */
    device?: 'desktop' | 'tablet' | 'mobile'
    /**
     * Parameter will force SerpApi to fetch the Google results even if a cached
     * version is already present. A cache is served only if the query and all
     * parameters are exactly the same. Cache expires after 1h. Cached searches
     * are free, and are not counted towards your searches per month. It can be set
     * to `false` (default) to allow results from the cache, or `true` to disallow
     * results from the cache. `no_cache` and `async` parameters should not be used together.
     */
    no_cache?: boolean
    /**
     * Specify the client-side timeout of the request. In milliseconds.
     */
    timeout?: number
}

export interface SerpAPIParameters extends BaseParameters {
    /**
     * Search Query
     * Parameter defines the query you want to search. You can use anything that you
     * would use in a regular Google search. e.g. `inurl:`, `site:`, `intitle:`. We
     * also support advanced search query parameters such as as_dt and as_eq. See the
     * [full list](https://serpapi.com/advanced-google-query-parameters) of supported
     * advanced search query parameters.
     */
    q: string
    /**
     * Location
     * Parameter defines from where you want the search to originate. If several
     * locations match the location requested, we'll pick the most popular one. Head to
     * [/locations.json API](https://serpapi.com/locations-api) if you need more
     * precise control. location and uule parameters can't be used together. Avoid
     * utilizing location when setting the location outside the U.S. when using Google
     * Shopping and/or Google Product API.
     */
    location?: string
    /**
     * Encoded Location
     * Parameter is the Google encoded location you want to use for the search. uule
     * and location parameters can't be used together.
     */
    uule?: string
    /**
     * Google Place ID
     * Parameter defines the id (`CID`) of the Google My Business listing you want to
     * scrape. Also known as Google Place ID.
     */
    ludocid?: string
    /**
     * Additional Google Place ID
     * Parameter that you might have to use to force the knowledge graph map view to
     * show up. You can find the lsig ID by using our [Local Pack
     * API](https://serpapi.com/local-pack) or [Local Places Results
     * API](https://serpapi.com/local-results).
     * lsig ID is also available via a redirect Google uses within [Google My
     * Business](https://www.google.com/business/).
     */
    lsig?: string
    /**
     * Google Knowledge Graph ID
     * Parameter defines the id (`KGMID`) of the Google Knowledge Graph listing you
     * want to scrape. Also known as Google Knowledge Graph ID. Searches with kgmid
     * parameter will return results for the originally encrypted search parameters.
     * For some searches, kgmid may override all other parameters except start, and num
     * parameters.
     */
    kgmid?: string
    /**
     * Google Cached Search Parameters ID
     * Parameter defines the cached search parameters of the Google Search you want to
     * scrape. Searches with si parameter will return results for the originally
     * encrypted search parameters. For some searches, si may override all other
     * parameters except start, and num parameters. si can be used to scrape Google
     * Knowledge Graph Tabs.
     */
    si?: string
    /**
     * Domain
     * Parameter defines the Google domain to use. It defaults to `google.com`. Head to
     * the [Google domains page](https://serpapi.com/google-domains) for a full list of
     * supported Google domains.
     */
    google_domain?: string
    /**
     * Country
     * Parameter defines the country to use for the Google search. It's a two-letter
     * country code. (e.g., `us` for the United States, `uk` for United Kingdom, or
     * `fr` for France). Head to the [Google countries
     * page](https://serpapi.com/google-countries) for a full list of supported Google
     * countries.
     */
    gl?: string
    /**
     * Language
     * Parameter defines the language to use for the Google search. It's a two-letter
     * language code. (e.g., `en` for English, `es` for Spanish, or `fr` for French).
     * Head to the [Google languages page](https://serpapi.com/google-languages) for a
     * full list of supported Google languages.
     */
    hl?: string
    /**
     * Set Multiple Languages
     * Parameter defines one or multiple languages to limit the search to. It uses
     * `lang_{two-letter language code}` to specify languages and `|` as a delimiter.
     * (e.g., `lang_fr|lang_de` will only search French and German pages). Head to the
     * [Google lr languages page](https://serpapi.com/google-lr-languages) for a full
     * list of supported languages.
     */
    lr?: string
    /**
     * as_dt
     * Parameter controls whether to include or exclude results from the site named in
     * the as_sitesearch parameter.
     */
    as_dt?: string
    /**
     * as_epq
     * Parameter identifies a phrase that all documents in the search results must
     * contain. You can also use the [phrase
     * search](https://developers.google.com/custom-search/docs/xml_results#PhraseSearchqt)
     * query term to search for a phrase.
     */
    as_epq?: string
    /**
     * as_eq
     * Parameter identifies a word or phrase that should not appear in any documents in
     * the search results. You can also use the [exclude
     * query](https://developers.google.com/custom-search/docs/xml_results#Excludeqt)
     * term to ensure that a particular word or phrase will not appear in the documents
     * in a set of search results.
     */
    as_eq?: string
    /**
     * as_lq
     * Parameter specifies that all search results should contain a link to a
     * particular URL. You can also use the
     * [link:](https://developers.google.com/custom-search/docs/xml_results#BackLinksqt)
     * query term for this type of query.
     */
    as_lq?: string
    /**
     * as_nlo
     * Parameter specifies the starting value for a search range. Use as_nlo and as_nhi
     * to append an inclusive search range.
     */
    as_nlo?: string
    /**
     * as_nhi
     * Parameter specifies the ending value for a search range. Use as_nlo and as_nhi
     * to append an inclusive search range.
     */
    as_nhi?: string
    /**
     * as_oq
     * Parameter provides additional search terms to check for in a document, where
     * each document in the search results must contain at least one of the additional
     * search terms. You can also use the [Boolean
     * OR](https://developers.google.com/custom-search/docs/xml_results#BooleanOrqt)
     * query term for this type of query.
     */
    as_oq?: string
    /**
     * as_q
     * Parameter provides search terms to check for in a document. This parameter is
     * also commonly used to allow users to specify additional terms to search for
     * within a set of search results.
     */
    as_q?: string
    /**
     * as_qdr
     * Parameter requests search results from a specified time period (quick date
     * range). The following values are supported:
     * `d[number]`: requests results from the specified number of past days. Example
     * for the past 10 days: `as_qdr=d10`
     * `w[number]`: requests results from the specified number of past weeks.
     * `m[number]`: requests results from the specified number of past months.
     * `y[number]`: requests results from the specified number of past years. Example
     * for the past year: `as_qdr=y`
     */
    as_qdr?: string
    /**
     * as_rq
     * Parameter specifies that all search results should be pages that are related to
     * the specified URL. The parameter value should be a URL. You can also use the
     * [related:](https://developers.google.com/custom-search/docs/xml_results#RelatedLinksqt)
     * query term for this type of query.
     */
    as_rq?: string
    /**
     * as_sitesearch
     * Parameter allows you to specify that all search results should be pages from a
     * given site. By setting the as_dt parameter, you can also use it to exclude pages
     * from a given site from your search resutls.
     */
    as_sitesearch?: string
    /**
     * Advanced Search Parameters
     * (to be searched) parameter defines advanced search parameters that aren't
     * possible in the regular query field. (e.g., advanced search for patents, dates,
     * news, videos, images, apps, or text contents).
     */
    tbs?: string
    /**
     * Adult Content Filtering
     * Parameter defines the level of filtering for adult content. It can be set to
     * `active`, or `off` (default).
     */
    safe?: string
    /**
     * Exclude Auto-corrected Results
     * Parameter defines the exclusion of results from an auto-corrected query that is
     * spelled wrong. It can be set to `1` to exclude these results, or `0` to include
     * them (default).
     */
    nfpr?: string
    /**
     * Results Filtering
     * Parameter defines if the filters for 'Similar Results' and 'Omitted Results' are
     * on or off. It can be set to `1` (default) to enable these filters, or `0` to
     * disable these filters.
     */
    filter?: string
    /**
     * Search Type
     * (to be matched) parameter defines the type of search you want to do.
     * It can be set to:
     * `(no tbm parameter)`: regular Google Search,
     * `isch`: [Google Images API](https://serpapi.com/images-results),
     * `lcl` - [Google Local API](https://serpapi.com/local-results)
     * `vid`: [Google Videos API](https://serpapi.com/videos-results),
     * `nws`: [Google News API](https://serpapi.com/news-results),
     * `shop`: [Google Shopping API](https://serpapi.com/shopping-results),
     * or any other Google service.
     */
    tbm?: string
    /**
     * Result Offset
     * Parameter defines the result offset. It skips the given number of results. It's
     * used for pagination. (e.g., `0` (default) is the first page of results, `10` is
     * the 2nd page of results, `20` is the 3rd page of results, etc.).
     * Google Local Results only accepts multiples of `20`(e.g. `20` for the second
     * page results, `40` for the third page results, etc.) as the start value.
     */
    start?: number
    /**
     * Number of Results
     * Parameter defines the maximum number of results to return. (e.g., `10` (default)
     * returns 10 results, `40` returns 40 results, and `100` returns 100 results).
     */
    num?: string
    /**
     * Page Number (images)
     * Parameter defines the page number for [Google
     * Images](https://serpapi.com/images-results). There are 100 images per page. This
     * parameter is equivalent to start (offset) = ijn * 100. This parameter works only
     * for [Google Images](https://serpapi.com/images-results) (set tbm to `isch`).
     */
    ijn?: string
}

type UrlParameters = Record<string, string | number | boolean | undefined | null>

/**
 * Wrapper around SerpAPI.
 *
 * To use, you should have the `serpapi` package installed and the SERPAPI_API_KEY environment variable set.
 */
export class SerpAPI extends Tool {
    static lc_name() {
        return 'SerpAPI'
    }

    toJSON() {
        return this.toJSONNotImplemented()
    }

    protected key: string

    protected params: Partial<SerpAPIParameters>

    protected baseUrl: string

    constructor(
        apiKey: string | undefined = getEnvironmentVariable('SERPAPI_API_KEY'),
        params: Partial<SerpAPIParameters> = {},
        baseUrl = 'https://serpapi.com'
    ) {
        super(...arguments)

        if (!apiKey) {
            throw new Error('SerpAPI API key not set. You can set it as SERPAPI_API_KEY in your .env file, or pass it to SerpAPI.')
        }

        this.key = apiKey
        this.params = params
        this.baseUrl = baseUrl
    }

    name = 'search'

    /**
     * Builds a URL for the SerpAPI request.
     * @param path The path for the request.
     * @param parameters The parameters for the request.
     * @param baseUrl The base URL for the request.
     * @returns A string representing the built URL.
     */
    protected buildUrl<P extends UrlParameters>(path: string, parameters: P, baseUrl: string): string {
        const nonUndefinedParams: [string, string][] = Object.entries(parameters)
            .filter(([_, value]) => value !== undefined)
            .map(([key, value]) => [key, `${value}`])
        const searchParams = new URLSearchParams(nonUndefinedParams)
        return `${baseUrl}/${path}?${searchParams}`
    }

    /** @ignore */
    async _call(input: string) {
        const { timeout, ...params } = this.params
        const resp = await fetch(
            this.buildUrl(
                'search',
                {
                    ...params,
                    api_key: this.key,
                    q: input
                },
                this.baseUrl
            ),
            {
                signal: timeout ? AbortSignal.timeout(timeout) : undefined
            }
        )

        const res = await resp.json()

        if (res.error) {
            throw new Error(`Got error from serpAPI: ${res.error}`)
        }

        const answer_box = res.answer_box_list ? res.answer_box_list[0] : res.answer_box
        if (answer_box) {
            if (answer_box.result) {
                return answer_box.result
            } else if (answer_box.answer) {
                return answer_box.answer
            } else if (answer_box.snippet) {
                return answer_box.snippet
            } else if (answer_box.snippet_highlighted_words) {
                return answer_box.snippet_highlighted_words.toString()
            } else {
                const answer: { [key: string]: string } = {}
                Object.keys(answer_box)
                    .filter(
                        (k) =>
                            !Array.isArray(answer_box[k]) &&
                            typeof answer_box[k] !== 'object' &&
                            !(typeof answer_box[k] === 'string' && answer_box[k].startsWith('http'))
                    )
                    .forEach((k) => {
                        answer[k] = answer_box[k]
                    })
                return JSON.stringify(answer)
            }
        }

        if (res.events_results) {
            return JSON.stringify(res.events_results)
        }

        if (res.sports_results) {
            return JSON.stringify(res.sports_results)
        }

        if (res.top_stories) {
            return JSON.stringify(res.top_stories)
        }

        if (res.news_results) {
            return JSON.stringify(res.news_results)
        }

        if (res.jobs_results?.jobs) {
            return JSON.stringify(res.jobs_results.jobs)
        }

        if (res.questions_and_answers) {
            return JSON.stringify(res.questions_and_answers)
        }

        if (res.popular_destinations?.destinations) {
            return JSON.stringify(res.popular_destinations.destinations)
        }

        if (res.top_sights?.sights) {
            const sights: Array<{ [key: string]: string }> = res.top_sights.sights
                .map((s: { [key: string]: string }) => ({
                    title: s.title,
                    description: s.description,
                    price: s.price
                }))
                .slice(0, 8)
            return JSON.stringify(sights)
        }

        if (res.shopping_results && res.shopping_results[0]?.title) {
            return JSON.stringify(res.shopping_results.slice(0, 3))
        }

        if (res.images_results && res.images_results[0]?.thumbnail) {
            return res.images_results
                .map((ir: { thumbnail: string }) => ir.thumbnail)
                .slice(0, 10)
                .toString()
        }

        const snippets = []
        if (res.knowledge_graph) {
            if (res.knowledge_graph.description) {
                snippets.push(res.knowledge_graph.description)
            }

            const title = res.knowledge_graph.title || ''
            Object.keys(res.knowledge_graph)
                .filter(
                    (k) =>
                        typeof res.knowledge_graph[k] === 'string' &&
                        k !== 'title' &&
                        k !== 'description' &&
                        !k.endsWith('_stick') &&
                        !k.endsWith('_link') &&
                        !k.startsWith('http')
                )
                .forEach((k) => snippets.push(`${title} ${k}: ${res.knowledge_graph[k]}`))
        }

        const first_organic_result = res.organic_results?.[0]
        if (first_organic_result) {
            if (first_organic_result.snippet) {
                snippets.push(first_organic_result.snippet)
            } else if (first_organic_result.snippet_highlighted_words) {
                snippets.push(first_organic_result.snippet_highlighted_words)
            } else if (first_organic_result.rich_snippet) {
                snippets.push(first_organic_result.rich_snippet)
            } else if (first_organic_result.rich_snippet_table) {
                snippets.push(first_organic_result.rich_snippet_table)
            } else if (first_organic_result.link) {
                snippets.push(first_organic_result.link)
            }
        }

        if (res.buying_guide) {
            snippets.push(res.buying_guide)
        }

        if (res.local_results?.places) {
            snippets.push(res.local_results.places)
        }

        if (snippets.length > 0) {
            return JSON.stringify(snippets)
        } else {
            return 'No good search result found'
        }
    }

    description = 'a search engine. useful for when you need to answer questions about current events. input should be a search query.'
}

class SerpAPI_Tools implements INode {
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
        this.label = 'Serp API'
        this.name = 'serpAPI'
        this.version = 1.0
        this.type = 'SerpAPI'
        this.icon = 'serp.svg'
        this.category = 'Tools'
        this.description = 'Wrapper around SerpAPI - a real-time API to access Google search results'
        this.inputs = []
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['serpApi']
        }
        this.baseClasses = [this.type, ...getBaseClasses(SerpAPI)]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const serpApiKey = getCredentialParam('serpApiKey', credentialData, nodeData)
        return new SerpAPI(serpApiKey)
    }
}

module.exports = { nodeClass: SerpAPI_Tools }
