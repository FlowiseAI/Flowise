const { fetchEntriesFromContentful, updateContentfulEntry, callChatflow } = require('../../functions')

const analyzeDocument = async (processor) => {
    try {
        const entries = await fetchEntriesFromContentful(processor.sourceContentTypeId, processor?.filters)
        let overrideConfig = processor?.overrideConfig || {}

        // Prepare the promises without awaiting them immediately
        const chatflowPromises = entries.map((entry) => {
            overrideConfig = {
                ...overrideConfig,
                promptValues: {
                    ...overrideConfig.promptValues,
                    summary: entry.fields[processor.summaryField]
                }
            }
            const answerAiData = {
                overrideConfig,
                question: entry.fields[processor.humanMessagePromptField],
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
        const analyzeResponses = []

        for (let skip = 0; skip < chatflowPromises.length; skip += batchSize) {
            const batch = chatflowPromises.slice(skip, skip + batchSize)
            const results = await Promise.all(batch)
            // Filter out any null responses due to errors
            analyzeResponses.push(
                ...results.map(({ response, entry, error }) => ({
                    entry,
                    summary: response?.data?.text || '',
                    error
                }))
            )
        }

        // Update Contentful entries with the document tags for successful responses
        const errors = []
        const updatedContentfulEntries = []
        for (let i = 0; i < analyzeResponses.length; i++) {
            const { entry, summary, error } = analyzeResponses[i]
            if (error || !summary) {
                console.error(`Error processing entry: ${entry.sys.id}`, error)
                errors.push({ entry, error })
                continue
            }

            // Loop through fields and create localized fields object for each param in teh document tags.
            const updatedFields = {
                [processor.summaryField]: { 'en-US': summary }
            }

            const updatedEntry = await updateContentfulEntry(entry, updatedFields)
            updatedContentfulEntries.push(updatedEntry)
            await new Promise((resolve) => setTimeout(resolve, 1000))
        }

        return {
            updatedContentfulEntries,
            errors
        }
    } catch (err) {
        console.error('Error in analyzeDocument: ', err)
        return []
    }
}

module.exports = analyzeDocument
