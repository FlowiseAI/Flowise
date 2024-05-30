import fetch from 'node-fetch'
import { Tool } from '@langchain/core/tools'

export const desc = `A portal to the internet. Use this when you need to get specific content from a website. 
Input should be a  url (i.e. https://www.google.com). The output will be the text response of the GET request.`

export interface Headers {
    [key: string]: string
}

export interface RequestParameters {
    headers?: Headers
    url?: string
    description?: string
    maxOutputLength?: number
}

export class RequestsGetTool extends Tool {
    name = 'requests_get'
    url = ''
    description = desc
    maxOutputLength = 2000
    headers = {}

    constructor(args?: RequestParameters) {
        super()
        this.url = args?.url ?? this.url
        this.headers = args?.headers ?? this.headers
        this.description = args?.description ?? this.description
        this.maxOutputLength = args?.maxOutputLength ?? this.maxOutputLength
    }

    /** @ignore */
    async _call(input: string) {
        const inputUrl = !this.url ? input : this.url

        if (process.env.DEBUG === 'true') console.info(`Making GET API call to ${inputUrl}`)

        const res = await fetch(inputUrl, {
            headers: this.headers
        })

        const text = await res.text()
        return text.slice(0, this.maxOutputLength)
    }
}
