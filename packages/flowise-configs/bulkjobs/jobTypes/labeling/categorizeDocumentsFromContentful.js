const { fetchEntriesFromContentful, updateContentfulEntry, callChatflow } = require('../../functions')

const categorizeDocumentsFromContentful = async (processor) => {
    try {
        const entries = await fetchEntriesFromContentful(processor.sourceContentTypeId, processor?.filters)
        const overrideConfig = processor.overrideConfig || {}


        // Prepare the promises without awaiting them immediately
        const chatflowPromises = entries.map((entry) => {
            let question = ''
            if (processor.promptProcessor) {
                question = processor.promptProcessor(entry)
            } else if (entry.fields[processor.humanMessagePromptField]) {
                question = entry.fields[processor.humanMessagePromptField]
            }

            const answerAiData = {
                overrideConfig,
                question,
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
        const categorizedResponses = []

        for (let skip = 0; skip < chatflowPromises.length; skip += batchSize) {
            const batch = chatflowPromises.slice(skip, skip + batchSize)
            const results = await Promise.all(batch)
            // Filter out any null responses due to errors
            categorizedResponses.push(
                ...results.map(({ response, entry, error }) => ({
                    entry,
                    documentTags: response?.data?.json,
                    error
                }))
            )
        }

        // Update Contentful entries with the document tags for successful responses
        const errors = []
        const updatedContentfulEntries = []
        for (let i = 0; i < categorizedResponses.length; i++) {
            const { entry, documentTags = {}, error } = categorizedResponses[i]
            if (error || !documentTags) {
                console.error(`Error processing entry: ${entry.sys.id}`, error)
                errors.push({ entry, error })
                continue
            }

            // Loop through fields and create localized fields object for each param in teh document tags.
            const updatedFields = Object.keys(documentTags).reduce((acc, key) => {
                acc[key] = { 'en-US': documentTags[key] }
                return acc
            }, {})

            const updatedEntry = await updateContentfulEntry(entry, updatedFields)
            updatedContentfulEntries.push(updatedEntry)
            await new Promise((resolve) => setTimeout(resolve, 50))
        }

        return {
            updatedContentfulEntries,
            errors
        }
    } catch (err) {
        console.error('Error in categorizeDocumentsFromContentful: ', err)
        return []
    }
}

module.exports = categorizeDocumentsFromContentful
