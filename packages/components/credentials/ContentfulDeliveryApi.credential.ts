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
        this.version = 1.0
        this.description =
            'Refer to <a target="_blank" href="https://www.contentful.com/developers/docs/references/content-delivery-api/">official guide</a> on how to get your delivery keys in Contentful'
        this.inputs = [
            {
                label: 'Delivery or Preview Token',
                name: 'accessToken',
                type: 'password',
                placeholder: '<CONTENTFUL_DELIVERY_TOKEN>'
            },
            {
                label: 'Space Id',
                name: 'spaceId',
                type: 'string',
                placeholder: 'asdf1234'
            },
            {
                label: 'CDN Location',
                name: 'cdn',
                type: 'string',
                placeholder: 'cdn.contentful.com'
            }
        ]
    }
}

module.exports = { credClass: ContentfulDeliveryApi }
