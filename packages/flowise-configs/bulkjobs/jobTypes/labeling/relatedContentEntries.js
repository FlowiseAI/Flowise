const { fetchEntriesFromContentful, updateContentfulEntry, callChatflow } = require('../../functions')

const relatedContentEntries = async (processor) => {
    const entries = await fetchEntriesFromContentful(processor.sourceContentTypeId, processor.filters)
    const overrideConfig = processor.overrideConfig || {}

    // Prepare the promises without awaiting them immediately
    const chatflowPromises = entries.map((entry) => {
        const entryText = processor.promptProcessor(entry)
        const answerAiData = {
            overrideConfig,
            question: entryText,
            chatflowId: processor.chatflowId
        }
        return callChatflow(answerAiData)
            .then((response) => {
                if (!response || !response.data) {
                    const error = `No data received for entry: ${entry.sys.id}`
                    return {
                        response,
                        entry,
                        error
                    }
                }
                return {
                    response,
                    entry
                }
            })
            .catch((error) => {
                return {
                    response: null,
                    entry,
                    error
                }
            })
    })

    // Process each promise in batches
    const batchSize = 5
    const responses = []

    for (let skip = 0; skip < chatflowPromises.length; skip += batchSize) {
        const batch = chatflowPromises.slice(skip, skip + batchSize)
        const results = await Promise.all(batch)
        // Filter out any null responses due to errors
        responses.push(
            ...results.map(({ response, entry, error }) => ({
                entry,
                documents: response?.data || [],
                error
            }))
        )
    }

    console.log('responses', responses)

    // Update Contentful entries with the document tags for successful responses
    const errors = []
    const updatedContentfulEntries = []
    for (let i = 0; i < responses.length; i++) {
        const { entry, documents = [], error } = responses[i]
        if (error || !documents) {
            console.error(`Error processing entry: ${entry.sys.id}`, error)
            errors.push({ entry, error })
            continue
        }

        // Create an array of objects for the 'glossaryTerms' field
        const realtedEntries = documents.map((document) => {
            return {
                sys: {
                    id: document.metadata.entryId,
                    type: 'Link',
                    linkType: 'Entry'
                }
            }
        })
        // Loop through fields and create localized fields object for each param in teh document tags.
        const updatedFields = {
            glossaryTerms: {
                'en-US': realtedEntries
            }
        }

        const updatedEntry = await updateContentfulEntry(entry, updatedFields)
        updatedContentfulEntries.push(updatedEntry)
        await new Promise((resolve) => setTimeout(resolve, 200))
    }

    return {
        updatedContentfulEntries,
        errors
    }
}

module.exports = relatedContentEntries
