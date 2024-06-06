const analyzeComms = {
    name: 'analyzeComms',
    description: 'Analyzes the content of a document and tags it based on the content.',
    // chatflowId: '6b5da243-c3b8-4ddf-9076-22178f0d5c65', // Production
    chatflowId: '8de264c3-4ea3-4351-9100-3b6f10411dfd', // Localhost
    sourceContentTypeId: 'originalDocuments',
    summaryField: 'evidenceAgainst',
    humanMessagePromptField: 'textContent',
    filters: {
        'fields.typeOfDocument': 'Correspondence'
    },
    prompt: `
        Please analyze the content of this document and tag it based on the content.
    `
}

module.exports = analyzeComms
