const contentfulClients = require('./contentfulClients')
const { isPublished, isArchived } = require('./contentfulStates')

async function deleteContentEntries(entries) {
    const { managementClient, config } = contentfulClients
    for (const entry of entries) {
        try {
            const fullEntry = await managementClient.entry.get({
                spaceId: config.spaceId,
                environmentId: config.environmentId,
                entryId: entry.sys.id
            })
            if (isPublished(fullEntry)) {
                console.log('UNPUBLISHED: ', fullEntry.sys.id)
                await managementClient.entry.unpublish(
                    {
                        spaceId: config.spaceId,
                        environmentId: config.environmentId,
                        entryId: entry.sys.id
                    },
                    { ...entry }
                )
            }
            if (!isArchived(fullEntry)) {
                console.log('ARCHIVED: ', entry.sys.id)
                await managementClient.entry.archive(
                    {
                        spaceId: config.spaceId,
                        environmentId: config.environmentId,
                        entryId: entry.sys.id
                    },
                    { sys: entry.sys }
                )
            } else {
                console.log('ALREADY ARCHIVED: ', entry.sys.id)
            }
        } catch (error) {
            console.log(error)
        }
        console.log(`Deleted entry: ${entry.sys.id}`)
    }
    return 'complete'
}

module.exports = deleteContentEntries
