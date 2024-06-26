const createContentfulEntry = require('./createContentfulEntry')
const updateContentfulEntry = require('./updateContentfulEntry')

async function processEntry(fields, entry, processor) {
    let processedEntry
    if (processor?.sourceContentTypeId !== processor?.targetContentTypeId) {
        processedEntry = await createContentfulEntry(fields, processor?.targetContentTypeId)
    } else {
        processedEntry = await updateContentfulEntry(entry.sys.id, fields)
    }
    return processedEntry
}

async function processContentEntries(processor, responses) {
    // Update Contentful entries with the document tags for successful responses
    const errors = []
    const processedContentfulEntries = []
    for (let i = 0; i < responses.length; i++) {
        const { entry, response, error } = responses[i]
        if (error || !response || !response.data) {
            console.error(`Error processing entry: ${entry.sys.id}`, error)
            errors.push({ entry, error })
            continue
        }

        // Loop through fields and create localized fields object for each param in teh document tags.
        const locale = processor.locale || 'en-US'
        const updatedFields = processor.fieldsProcessor(response, entry, locale)

        if (!updatedFields) {
            console.error(`Error processing entry: ${entry.sys.id}`, error)
            errors.push({ entry, error })
            continue
        }

        // Check if updatedFields is an array and handle accordingly
        if (Array.isArray(updatedFields)) {
            for (const fields of updatedFields) {
                const processedEntry = await processEntry(fields, entry, processor).catch((error) => {
                    console.error(`Error processing entry: ${entry.sys.id}`, error)
                    errors.push({ entry, error })
                })
                processedContentfulEntries.push(processedEntry)
            }
        } else {
            const processedEntry = await processEntry(updatedFields, entry, processor).catch((error) => {
                console.error(`Error processing entry: ${entry.sys.id}`, error)
                errors.push({ entry, error })
            })
            processedContentfulEntries.push(processedEntry)
        }

        await new Promise((resolve) => setTimeout(resolve, 50))
    }
    return {
        processedContentfulEntries,
        errors
    }
}

module.exports = processContentEntries
