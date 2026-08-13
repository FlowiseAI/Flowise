import { z } from 'zod/v3'
import { DynamicStructuredTool } from '../OpenAPIToolkit/core'
import { TOOL_ARGS_PREFIX, formatToolError } from '../../../src/agents'
import { secureFetch } from '../../../src/httpSecurity'

/*
 * Shared core for the DataForB2B tool nodes.
 *
 * DataForB2B (https://api.dataforb2b.ai) is a B2B data API for searching and
 * enriching companies and professional (LinkedIn) profiles. Auth is the
 * `api_key` request header; get a key at https://app.dataforb2b.ai.
 *
 * Keeps parity with the Dify / Langflow / AutoGPT integrations: the same six
 * endpoints and the same `{op, conditions:[{column,type,value,value2?}]}`
 * filter shape. Each Flowise node returns exactly one of the tools built here.
 */

export const API_URL = 'https://api.dataforb2b.ai'

// --- Filter columns / operators (source of truth: the Dify integration) -----

export const OPERATORS = ['=', '!=', 'like', 'not_like', 'in', 'not_in', '>', '>=', '<', '<=', 'between']

export const PEOPLE_COLUMNS = [
    'first_name', 'last_name', 'profile_location', 'profile_country', 'profile_industry', 'follower_count', 'keyword',
    'current_company', 'current_title', 'current_job_location', 'current_company_industry', 'current_company_category',
    'current_company_size', 'current_company_id', 'current_employment_type', 'years_in_current_position',
    'years_at_current_company', 'current_company_has_funding', 'current_company_funding_stage', 'current_company_investor',
    'past_company', 'past_title', 'past_job_location', 'past_company_industry', 'past_company_size', 'past_company_id',
    'past_employment_type', 'years_at_past_company', 'skill', 'school', 'degree', 'degree_level', 'field_of_study',
    'language', 'language_iso', 'language_proficiency', 'certification', 'certification_authority', 'years_of_experience',
    'num_total_jobs', 'is_currently_employed'
]

export const COMPANY_COLUMNS = [
    'name', 'tagline', 'description', 'domain', 'universal_name', 'keyword', 'industry', 'employee_count',
    'country_iso_code', 'city', 'region', 'office_country', 'office_city', 'office_region', 'employee_growth_1m',
    'employee_growth_6m', 'employee_growth_12m', 'recent_hires_count', 'founded_year', 'company_type', 'follower_count',
    'page_verified', 'category', 'last_funding_amount_usd', 'last_funding_date', 'funding_stage_normalized', 'has_funding'
]

export const TYPEAHEAD_TYPES = [
    'company', 'people_industry', 'company_industry', 'category', 'location', 'city', 'region', 'school', 'title',
    'skill', 'investor'
]

// --- Zod schemas -------------------------------------------------------------

const ConditionSchema = z.object({
    column: z.string().describe('Filter column name (see the tool description for the full list).'),
    type: z.string().describe(`Operator, one of: ${OPERATORS.join(', ')}.`),
    value: z
        .any()
        .describe('Value to match. Use an array for "in"/"not_in". For "between", set value (min) and value2 (max).'),
    value2: z.any().optional().describe('Upper bound — only for the "between" operator.')
})

const FiltersSchema = z.object({
    op: z.enum(['and', 'or']).default('and').describe('How to combine the conditions.'),
    conditions: z.array(ConditionSchema).describe('List of filter conditions.')
})

export const SearchSchema = z.object({
    filters: FiltersSchema.describe('Structured filters.'),
    limit: z.number().int().optional().default(25).describe('Max results to return (default 25).'),
    offset: z.number().int().optional().default(0).describe('Pagination offset (e.g. 25, 50).')
})

export const ReasoningSchema = z.object({
    query: z.string().optional().describe('Natural-language description of the ideal lead/company (ICP). Required on the first call.'),
    category: z.enum(['people', 'companies']).optional().default('people').describe('Search people or companies.'),
    max_results: z.number().int().optional().default(25).describe('Max results (1-100, default 25).'),
    session_id: z.string().optional().describe('Session id from a previous "needs_input" response, to refine the search.'),
    answers: z.record(z.string()).optional().describe('Answers to clarifying questions ({question_id: answer}) for a needs_input turn.')
})

export const TypeaheadSchema = z.object({
    type: z.enum(TYPEAHEAD_TYPES as [string, ...string[]]).describe('Which kind of value to resolve.'),
    q: z.string().describe('Free-text query (1-100 chars) to resolve to a stored value.'),
    limit: z.number().int().optional().default(20).describe('Max suggestions (1-20).')
})

export const EnrichProfileSchema = z.object({
    profile_identifier: z
        .string()
        .describe('LinkedIn profile URL, public id (e.g. john-doe) or encoded id (prof_...).'),
    enrich_profile: z.boolean().optional().describe('Return the full profile (role, experience, skills).'),
    enrich_work_email: z.boolean().optional().describe('Find the professional/work email.'),
    enrich_personal_email: z.boolean().optional().describe('Find the personal email.'),
    enrich_phone: z.boolean().optional().describe('Find the phone number.'),
    enrich_github: z.boolean().optional().describe('Find the GitHub profile.')
})

export const EnrichCompanySchema = z.object({
    company_identifier: z
        .string()
        .describe('Company domain (e.g. google.com), name, slug or LinkedIn company URL.')
})

// --- Base tool ---------------------------------------------------------------

class BaseDataForB2BTool extends DynamicStructuredTool {
    protected apiKey: string = ''

    constructor(args: any) {
        super(args)
        this.apiKey = args.apiKey ?? ''
    }

    protected async request(method: 'GET' | 'POST', path: string, payload: any, params: any): Promise<string> {
        const headers = {
            api_key: this.apiKey,
            'Content-Type': 'application/json',
            Accept: 'application/json'
        }

        let url = `${API_URL}${path}`
        const fetchOptions: any = { method, headers }

        if (method === 'GET') {
            const qs = new URLSearchParams()
            for (const [k, v] of Object.entries(payload || {})) {
                if (v !== undefined && v !== null && `${v}` !== '') qs.append(k, `${v}`)
            }
            const query = qs.toString()
            if (query) url += `?${query}`
        } else {
            fetchOptions.body = JSON.stringify(payload ?? {})
        }

        const response = await secureFetch(url, fetchOptions, 5)
        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`DataForB2B API Error ${response.status}: ${response.statusText} - ${errorText}`)
        }
        const data = await response.text()
        return data + TOOL_ARGS_PREFIX + JSON.stringify(params)
    }
}

// --- Tools -------------------------------------------------------------------

const PEOPLE_DESC =
    'Search people and B2B leads by structured filters such as job title, company, location, industry, ' +
    'seniority, skills, funding and LinkedIn URL, using DataForB2B. Find employees at a company, decision-makers ' +
    `and key contacts. Common columns: ${PEOPLE_COLUMNS.slice(0, 16).join(', ')}, ... Operators: ${OPERATORS.join(', ')}.`

const COMPANY_DESC =
    'Search companies and accounts by structured filters such as industry, headcount/size, location, funding ' +
    'stage, keywords and LinkedIn URL, using DataForB2B. Build target account lists for B2B sales. ' +
    `Common columns: ${COMPANY_COLUMNS.slice(0, 16).join(', ')}, ... Operators: ${OPERATORS.join(', ')}.`

export class SearchPeopleTool extends BaseDataForB2BTool {
    constructor(args: any) {
        super({
            ...args,
            name: 'dataforb2b_search_people',
            description: PEOPLE_DESC,
            schema: SearchSchema,
            baseUrl: '',
            method: 'POST',
            headers: {}
        })
    }

    async _call(arg: any): Promise<string> {
        try {
            const payload = { filters: arg.filters, limit: arg.limit ?? 25, offset: arg.offset ?? 0, enrich_live: false }
            return await this.request('POST', '/search/people', payload, arg)
        } catch (error) {
            return formatToolError(`Error searching people: ${error}`, arg)
        }
    }
}

export class SearchCompaniesTool extends BaseDataForB2BTool {
    constructor(args: any) {
        super({
            ...args,
            name: 'dataforb2b_search_companies',
            description: COMPANY_DESC,
            schema: SearchSchema,
            baseUrl: '',
            method: 'POST',
            headers: {}
        })
    }

    async _call(arg: any): Promise<string> {
        try {
            const payload = { filters: arg.filters, limit: arg.limit ?? 25, offset: arg.offset ?? 0, enrich_live: false }
            return await this.request('POST', '/search/companies', payload, arg)
        } catch (error) {
            return formatToolError(`Error searching companies: ${error}`, arg)
        }
    }
}

export class ReasoningSearchTool extends BaseDataForB2BTool {
    constructor(args: any) {
        super({
            ...args,
            name: 'dataforb2b_reasoning_search',
            description:
                'Natural language search for people, leads or companies using DataForB2B. ' +
                "Describe your ideal lead or ICP in plain English (e.g. 'marketing directors at Series A SaaS startups " +
                "in France'). If the response status is \"needs_input\", call again with session_id + answers.",
            schema: ReasoningSchema,
            baseUrl: '',
            method: 'POST',
            headers: {}
        })
    }

    async _call(arg: any): Promise<string> {
        try {
            if (!arg.query && !arg.session_id) {
                throw new Error("Provide 'query' (first call) or 'session_id' + 'answers' (to resolve a needs_input turn).")
            }
            const payload: any = {
                category: arg.category ?? 'people',
                max_results: arg.max_results ?? 25,
                enrich_live: false
            }
            if (arg.query) payload.query = arg.query
            if (arg.session_id) payload.session_id = arg.session_id
            if (arg.answers) payload.answers = arg.answers
            return await this.request('POST', '/search/reasoning', payload, arg)
        } catch (error) {
            return formatToolError(`Error in reasoning search: ${error}`, arg)
        }
    }
}

export class TypeaheadTool extends BaseDataForB2BTool {
    constructor(args: any) {
        super({
            ...args,
            name: 'dataforb2b_typeahead',
            description:
                'Resolve the exact stored value for a free text filter (company, industry, job title, skill, school, ' +
                'location, investor, category) before a people or company search on DataForB2B. Use it to normalize ' +
                'free text, or when a search returns few or no results.',
            schema: TypeaheadSchema,
            baseUrl: '',
            method: 'GET',
            headers: {}
        })
    }

    async _call(arg: any): Promise<string> {
        try {
            const limit = Math.max(1, Math.min(Number(arg.limit ?? 20), 20))
            return await this.request('GET', '/typeahead', { type: arg.type, q: arg.q, limit }, arg)
        } catch (error) {
            return formatToolError(`Error in typeahead: ${error}`, arg)
        }
    }
}

export class EnrichProfileTool extends BaseDataForB2BTool {
    constructor(args: any) {
        super({
            ...args,
            name: 'dataforb2b_enrich_profile',
            description:
                'Look up and enrich a professional profile from a LinkedIn URL using DataForB2B. Returns the full ' +
                'profile (current role, experience, skills) plus work email, personal email, phone and GitHub. ' +
                'An email finder for lead enrichment. At least one enrich_* flag is used (defaults to enrich_profile).',
            schema: EnrichProfileSchema,
            baseUrl: '',
            method: 'POST',
            headers: {}
        })
    }

    async _call(arg: any): Promise<string> {
        try {
            const flags = ['enrich_profile', 'enrich_work_email', 'enrich_personal_email', 'enrich_phone', 'enrich_github']
            const payload: any = { profile_identifier: arg.profile_identifier }
            let anyFlag = false
            for (const f of flags) {
                if (arg[f]) {
                    payload[f] = true
                    anyFlag = true
                }
            }
            if (!anyFlag) payload.enrich_profile = true
            return await this.request('POST', '/enrich/profile', payload, arg)
        } catch (error) {
            return formatToolError(`Error enriching profile: ${error}`, arg)
        }
    }
}

export class EnrichCompanyTool extends BaseDataForB2BTool {
    constructor(args: any) {
        super({
            ...args,
            name: 'dataforb2b_enrich_company',
            description:
                'Look up and enrich a company using DataForB2B from a company domain, name or LinkedIn URL. ' +
                'Returns firmographics, headcount/size, industry, domain and social profiles. ' +
                'Account enrichment for B2B sales and CRM.',
            schema: EnrichCompanySchema,
            baseUrl: '',
            method: 'POST',
            headers: {}
        })
    }

    async _call(arg: any): Promise<string> {
        try {
            return await this.request('POST', '/enrich/company', { company_identifier: arg.company_identifier }, arg)
        } catch (error) {
            return formatToolError(`Error enriching company: ${error}`, arg)
        }
    }
}
