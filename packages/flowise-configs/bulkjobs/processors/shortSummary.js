const instructions = `
    Analyze this coorespondence and create a very short and concise summary of the content.
    Include the type of coorespondence and with whom, the main points, and resolution or next steps.
    The summary should be written using as few words as possible.
    It should be written as a short paragraph and easily scanable by an executive looking at a list of summaries.
    `
const shortSummary = {
    name: 'shortSummary',
    description: 'Analyzes the content of a document and creates a short story.',
    // chatflowId: '6b5da243-c3b8-4ddf-9076-22178f0d5c65', // Production
    chatflowId: '8de264c3-4ea3-4351-9100-3b6f10411dfd', // Localhost
    sourceContentTypeId: 'originalDocuments',
    summaryField: 'shortSummary',
    humanMessagePromptField: 'textContent',
    filters: {
        'fields.typeOfDocument': 'Correspondence'
    },
    overrideConfig: {
        promptValues: {
            instructions
        }
    }
}

module.exports = shortSummary
