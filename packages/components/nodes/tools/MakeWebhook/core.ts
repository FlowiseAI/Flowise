import axios, { AxiosRequestConfig, Method } from 'axios'
import { Tool } from 'langchain/tools'
import { ICommonObject } from '../../../src/Interface'

export class MakeWebhookTool extends Tool {
    private url: string

    name: string

    description: string

    method: string

    headers: ICommonObject

    constructor(url: string, description: string, method = 'POST', headers: ICommonObject = {}) {
        super()
        this.url = url
        this.name = 'make_webhook'
        this.description = description ?? `useful for when you need to execute tasks on Make`
        this.method = method
        this.headers = headers
    }

    async _call(): Promise<string> {
        try {
            const axiosConfig: AxiosRequestConfig = {
                method: this.method as Method,
                url: this.url,
                headers: {
                    ...this.headers,
                    'Content-Type': 'application/json'
                }
            }
            const response = await axios(axiosConfig)
            return typeof response.data === 'object' ? JSON.stringify(response.data) : response.data
        } catch (error) {
            throw new Error(`HTTP error ${error}`)
        }
    }
}
