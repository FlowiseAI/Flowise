import { AIMessage, BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages'

export interface Config {
    baseUrl: string
    configurationId: string
}

export class ClientConfig implements Config {
    baseUrl: string
    configurationId: string

    constructor(baseUrl: string, configurationId: string) {
        this.baseUrl = baseUrl
        this.configurationId = configurationId
    }
}

export class NemoClient {
    private readonly config: Config

    constructor(baseUrl: string, configurationId: string) {
        this.config = new ClientConfig(baseUrl, configurationId)
    }

    getRoleFromMessage(message: BaseMessage): string {
        if (message instanceof HumanMessage || message instanceof SystemMessage) {
            return 'user'
        }

        //AIMessage, ToolMessage, FunctionMessage
        return 'assistant'
    }

    getContentFromMessage(message: BaseMessage): string {
        return message.content.toString()
    }

    buildBody(messages: BaseMessage[], configurationId: string): any {
        const bodyMessages = messages.map((message) => {
            return {
                role: this.getRoleFromMessage(message),
                content: this.getContentFromMessage(message)
            }
        })

        const body = {
            config_id: configurationId,
            messages: bodyMessages
        }

        return body
    }

    async chat(messages: BaseMessage[]): Promise<AIMessage[]> {
        const headers = new Headers()
        headers.append('Content-Type', 'application/json')

        const body = this.buildBody(messages, this.config.configurationId)

        const requestOptions = {
            method: 'POST',
            body: JSON.stringify(body),
            headers: headers
        }

        return await fetch(`${this.config.baseUrl}/v1/chat/completions`, requestOptions)
            .then((response) => response.json())
            .then((body) => body.messages.map((message: any) => new AIMessage(message.content)))
    }
}
