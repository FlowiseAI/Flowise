const contentful = require('contentful')
const contentfulManagement = require('contentful-management')

const config = {
    spaceId: process.env.CONTENTFUL_SPACE_ID,
    environmentId: process.env.CONTENTFUL_ENVIRONMENT_ID,
    deliveryToken: process.env.CONTENTFUL_DELIVERY_TOKEN,
    managementToken: process.env.CONTENTFUL_MANAGEMENT_TOKEN,
    host: process.env.CONTENTFUL_HOST || 'cdn.contentful.com'
}

// Client configurations for Contentful and Contentful Management
const deliveryClient = contentful.createClient({
    space: config.spaceId,
    environment: config.environmentId,
    accessToken: config.deliveryToken,
    host: 'preview.contentful.com'
})

const managementClient = contentfulManagement.createClient(
    {
        accessToken: config.managementToken
    },
    { type: 'plain' }
)

const contentfulClients = { deliveryClient, managementClient, config }

module.exports = contentfulClients
