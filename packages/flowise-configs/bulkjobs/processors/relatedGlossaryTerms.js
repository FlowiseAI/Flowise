const { convertEntryToPlainText } = require('../functions')
const relatedGlossaryTerms = {
    name: 'relatedGlossaryTerms',
    description: 'Analyzes the content of a document and tags it based on the content.',
    // chatflowId: '6b5da243-c3b8-4ddf-9076-22178f0d5c65', // Production
    chatflowId: '41718e35-b8e7-4ac4-8fca-7a84a380d2ba', // Localhost
    sourceContentTypeId: 'article',
    filters: {
        'sys.id[nin]': [
            'kA03k000000oaqkCAA_en_US_3',
            'kA03k0000003liPCAQ_en_US_3',
            '6hiAoXYRLwmofGowngYp6S',
            'kA03k000000oZ9UCAU_en_US_3',
            'kA03k0000005ymOCAQ_en_US_3',
            '1VF83OG9utp9evthutzDqX',
            'EBEOu8zoJt3nkgkbNWab5',
            'kA03k000000oZ7uCAE_en_US_3' // Too long report builder
        ]
    },
    promptProcessor: (entry) => {
        const fieldsToParse = ['title', 'summary', 'body', 'relatedLinks']
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

module.exports = relatedGlossaryTerms
