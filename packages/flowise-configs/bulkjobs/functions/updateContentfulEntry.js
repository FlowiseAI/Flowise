const { managementClient, config } = require('./contentfulClients')
async function updateContentfulEntry(entry, updatedFields) {
    try {
        const existingEntry = await managementClient.entry.get({
            spaceId: config.spaceId,
            environmentId: config.environmentId,
            contentTypeId: entry.sys.contentType.sys.id,
            entryId: entry.sys.id
        })

        // Update all fields with the update fields
        const allFields = { ...existingEntry.fields, ...updatedFields }

        // delay for 1 second to avoid rate limiting

        const updatedEntry = await managementClient.entry.update(
            {
                spaceId: config.spaceId,
                environmentId: config.environmentId,
                contentTypeId: entry.sys.contentType.sys.id,
                entryId: existingEntry.sys.id
            },
            {
                sys: existingEntry.sys,
                fields: allFields
            }
        )

        console.log(`Updated entry: ${updatedEntry.sys.id}`)

        return {
            entry: updatedEntry
        }
    } catch (err) {
        console.error(`Error updating entry: ${entry.sys.id}`, err)
        return {
            entry,
            error: {
                updatedFields,
                err
            }
        }
    }
}

module.exports = updateContentfulEntry
