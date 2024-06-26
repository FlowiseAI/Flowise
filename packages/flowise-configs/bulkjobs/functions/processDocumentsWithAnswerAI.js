const callChatflow = require('./callChatflow')

async function processDocumentsWithAnswerAI(entries, processor, overrideConfig = {}) {
    if (!entries || !entries.length) {
        return []
    }

    if (!processor?.answerAiData) {
        throw new Error('processor.answerAiData is required')
    }
    const chatflowPromises = entries.map((entry) => {
        const answerAiData = processor.answerAiData(entry, overrideConfig)
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
    const batchSize = processor?.batchSize || 5
    const responses = []

    for (let skip = 0; skip < chatflowPromises.length; skip += batchSize) {
        const batch = chatflowPromises.slice(skip, skip + batchSize)
        const results = await Promise.all(batch)
        // Filter out any null responses due to errors
        responses.push(
            ...results.map(({ response, entry, error }) => ({
                entry,
                response,
                error
            }))
        )
    }

    return responses
}

module.exports = processDocumentsWithAnswerAI
