import { INodeParams, INodeCredential } from '../src/Interface'

class ContentfulManagementApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Contentful Management API'
        this.name = 'contentfulManagementApi'
        this.version = 1.1
        this.description =
            'Refer to <a target="_blank" href="https://www.contentful.com/developers/docs/references/content-Management-api/">official guide</a> on how to get your Management and preview keys in Contentful'
        this.inputs = [
            {
                label: 'Management Token',
                name: 'managementToken',
                type: 'string',
                placeholder: '<CONTENTFUL_MANAGEMENT_TOKEN>'
            },
            {
                label: 'Space Id',
                name: 'spaceId',
                type: 'string',
                placeholder: 'asdf1234'
            }
        ]
    }
}

module.exports = { credClass: ContentfulManagementApi }
