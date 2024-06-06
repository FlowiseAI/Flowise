const contentfulClients = require('./contentfulClients')

async function createContentfulEntry(fields, contentTypeId) {
    const { managementClient, config } = contentfulClients

    const entry = await managementClient.entry.create(
        {
            spaceId: config.spaceId,
            environmentId: config.environmentId,
            contentTypeId
        },
        { fields }
    )

    const publishedEntry = await managementClient.entry.publish(
        { spaceId: config.spaceId, environmentId: config.environmentId, entryId: entry.sys.id },
        { ...entry }
    )
    console.log(`Created and published entry: ${entry.sys.id}`)

    return publishedEntry
}

module.exports = createContentfulEntry
