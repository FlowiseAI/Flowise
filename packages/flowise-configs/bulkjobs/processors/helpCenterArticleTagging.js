const { convertEntryToPlainText } = require('../functions')

const helpCenterArticleTagging = {
    name: 'helpCenterArticleTagging',
    description:
        'Categorize and label help center articles based on the content for Type of Article, Complexity, Target Audience, and Purpose',
    chatflowId: '71c84da2-9fa8-40d8-be44-63dbe7b20493', // IAS
    // chatflowId: 'fb1f119b-e85d-4cb3-a781-dcfe9dc7b0cb', // Localhost
    sourceContentTypeId: 'article',
    promptProcessor: (entry) => {
        const fieldsToParse = ['title', 'summary', 'body']
        const richTextParsingRules = {
            'embedded-asset-block': true,
            'embedded-entry-block': true,
            'embedded-entry-inline': true,
            embeddedContentTypes: {
                table: ['table', 'internalTitle'],
                section: ['contents'],
                text: ['body'],
                media: ['asset'],
                article: ['title', 'slug', 'summary']
            }
        }
        const plainTextEntry = convertEntryToPlainText(entry, fieldsToParse, richTextParsingRules)
        return plainTextEntry
    }
}

module.exports = helpCenterArticleTagging
