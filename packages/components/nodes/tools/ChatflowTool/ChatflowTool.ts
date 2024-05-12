import { DataSource } from 'typeorm'
import { Tool } from '@langchain/core/tools'
import fetch from 'node-fetch'
import { ICommonObject, IDatabaseEntity, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { getCredentialData, getCredentialParam } from '../../../src/utils'

class ChatflowTool_Tools implements INode {
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
        this.label = 'Chatflow Tool'
        this.name = 'ChatflowTool'
        this.version = 1.0
        this.type = 'ChatflowTool'
        this.icon = 'chatflowTool.svg'
        this.category = 'Tools'
        this.description = 'Use as a tool to execute another chatflow'
        this.baseClasses = [this.type, 'Tool']
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['chatflowApi'],
            optional: true
        }
        this.inputs = [
            {
                label: 'Select Chatflow',
                name: 'selectedChatflow',
                type: 'asyncOptions',
                loadMethod: 'listChatflows'
            },
            {
                label: 'Tool Name',
                name: 'name',
                type: 'string'
            },
            {
                label: 'Tool Description',
                name: 'description',
                type: 'string',
                description: 'Description of what the tool does. This is for LLM to determine when to use this tool.',
                rows: 3,
                placeholder:
                    'State of the Union QA - useful for when you need to ask questions about the most recent state of the union address.'
            },
            {
                label: 'Use Question from Chat',
                name: 'useQuestionFromChat',
                type: 'boolean',
                description:
                    'Whether to use the question from the chat as input to the chatflow. If turned on, this will override the custom input.',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Custom Input',
                name: 'customInput',
                type: 'string',
                description: 'Custom input to be passed to the chatflow. Leave empty to let LLM decides the input.',
                optional: true,
                additionalParams: true
            }
        ]
    }

    //@ts-ignore
    loadMethods = {
        async listChatflows(_: INodeData, options: ICommonObject): Promise<INodeOptionsValue[]> {
            const returnData: INodeOptionsValue[] = []

            const appDataSource = options.appDataSource as DataSource
            const databaseEntities = options.databaseEntities as IDatabaseEntity
            if (appDataSource === undefined || !appDataSource) {
                return returnData
            }

            const chatflows = await appDataSource.getRepository(databaseEntities['ChatFlow']).find()

            for (let i = 0; i < chatflows.length; i += 1) {
                const data = {
                    label: chatflows[i].name,
                    name: chatflows[i].id
                } as INodeOptionsValue
                returnData.push(data)
            }
            return returnData
        }
    }

    async init(nodeData: INodeData, input: string, options: ICommonObject): Promise<any> {
        const selectedChatflowId = nodeData.inputs?.selectedChatflow as string
        const _name = nodeData.inputs?.name as string
        const description = nodeData.inputs?.description as string
        const useQuestionFromChat = nodeData.inputs?.useQuestionFromChat as boolean
        const customInput = nodeData.inputs?.customInput as string

        const baseURL = options.baseURL as string

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const chatflowApiKey = getCredentialParam('chatflowApiKey', credentialData, nodeData)

        let headers = {}
        if (chatflowApiKey) headers = { Authorization: `Bearer ${chatflowApiKey}` }

        let toolInput = ''
        if (useQuestionFromChat) {
            toolInput = input
        } else if (!customInput) {
            toolInput = customInput
        }

        let name = _name || 'chatflow_tool'

        return new ChatflowTool({ name, baseURL, description, chatflowid: selectedChatflowId, headers, input: toolInput })
    }
}

class ChatflowTool extends Tool {
    static lc_name() {
        return 'ChatflowTool'
    }

    name = 'chatflow_tool'

    description = 'Execute another chatflow'

    input = ''

    chatflowid = ''

    baseURL = 'http://localhost:3000'

    headers = {}

    constructor({
        name,
        description,
        input,
        chatflowid,
        baseURL,
        headers
    }: {
        name: string
        description: string
        input: string
        chatflowid: string
        baseURL: string
        headers: ICommonObject
    }) {
        super()
        this.name = name
        this.description = description
        this.input = input
        this.baseURL = baseURL
        this.headers = headers
        this.chatflowid = chatflowid
    }

    async _call(_input: string): Promise<string> {
        const inputQuestion = this.input || _input

        const url = `${this.baseURL}/api/v1/prediction/${this.chatflowid}?disableSaveMessage=true`

        const body = {
            question: inputQuestion
        }

        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...this.headers
            },
            body: JSON.stringify(body)
        }

        try {
            const response = await fetch(url, options)
            const resp = await response.json()
            return resp.text || ''
        } catch (error) {
            console.error(error)
            return ''
        }
    }
}

module.exports = { nodeClass: ChatflowTool_Tools }
