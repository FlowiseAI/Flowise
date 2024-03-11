import { Tool } from 'langchain/tools'
import fetch from 'node-fetch'

export const desc = `Use this when you want to POST to a website.
Input should be a json string with two keys: "url" and "data".
The value of "url" should be a string, and the value of "data" should be a dictionary of 
key-value pairs you want to POST to the url as a JSON body.
Be careful to always use double quotes for strings in the json string
The output will be the text response of the POST request.`

export interface Headers {
    [key: string]: string
}

export interface Body {
    [key: string]: any
}

export interface RequestParameters {
    headers?: Headers
    body?: Body
    url?: string
    description?: string
    maxOutputLength?: number
}

export class RequestsPostTool extends Tool {
    name = 'requests_post'
    url = ''
    description = desc
    maxOutputLength = Infinity
    headers = {}
    body = {}

    constructor(args?: RequestParameters) {
        super()
        this.url = args?.url ?? this.url
        this.headers = args?.headers ?? this.headers
        this.body = args?.body ?? this.body
        this.description = args?.description ?? this.description
        this.maxOutputLength = args?.maxOutputLength ?? this.maxOutputLength
    }

    /** @ignore */
    async _call(input: string) {
        try {
            let inputUrl = ''
            let inputBody = {}
            if (Object.keys(this.body).length || this.url) {
                if (this.url) inputUrl = this.url
                if (Object.keys(this.body).length) inputBody = this.body
            } else {
                const { url, data } = JSON.parse(input)
                inputUrl = url
                inputBody = data
            }

            if (process.env.DEBUG === 'true') console.info(`Making POST API call to ${inputUrl} with body ${JSON.stringify(inputBody)}`)

            const res = await fetch(inputUrl, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify(inputBody)
            })

            const text = await res.text()
            return text.slice(0, this.maxOutputLength)
        } catch (error) {
            return `${error}`
        }
    }
}
