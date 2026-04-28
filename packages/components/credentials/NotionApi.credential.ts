import { INodeParams, INodeCredential } from '../src/Interface'

class NotionApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Notion API'
        this.name = 'notionApi'
        this.version = 1.0
        this.description =
            'You can find integration token <a target="_blank" href="https://developers.notion.com/docs/create-a-notion-integration#step-1-create-an-integration">here</a>'
        this.inputs = [
            {
                label: 'Notion Integration Token',
                name: 'notionIntegrationToken',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: NotionApi }
