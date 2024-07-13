import { INodeParams, INodeCredential } from '../src/Interface'

class ContentfulDeliveryApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Contentful Delivery API'
        this.name = 'contentfulDeliveryApi'
        this.version = 1.1
        this.description =
            'Refer to <a target="_blank" href="https://www.contentful.com/developers/docs/references/content-delivery-api/">official guide</a> on how to get your delivery and preview keys in Contentful'
        this.inputs = [
            {
                label: 'Delivery Token',
                name: 'deliveryToken',
                type: 'string',
                placeholder: '<CONTENTFUL_DELIVERY_TOKEN>'
            },
            {
                label: 'Preview Token',
                name: 'previewToken',
                type: 'string',
                placeholder: '<CONTENTFUL_PREVIEW_TOKEN>'
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

module.exports = { credClass: ContentfulDeliveryApi }
