const { convertEntryToPlainText } = require('../functions')
const relatedGlossaryTerms = {
    name: 'relatedGlossaryTerms',
    description: 'Analyzes the content of a document and tags it based on the content.',
    // chatflowId: '6b5da243-c3b8-4ddf-9076-22178f0d5c65', // Production
    chatflowId: '7f1f9d76-d255-40d7-9637-fa842d0c3228', // Localhost
    sourceContentTypeId: 'article',
    filters: {
        'sys.id[in]': [
            "kA03k0000003lj3CAA_en_US_3",
            "kA03k0000003lj8CAA_en_US_3",
            "kA03k000000oanRCAQ_en_US_3",
            "kA03k0000003ljDCAQ_en_US_3",
            "kA03k0000003lioCAA_en_US_3",
            "kA03k000000oZF4CAM_en_US_3",
            "kA03k000000oZ7uCAE_en_US_3",
            "kA03k000000oZLaCAM_en_US_3",
            "kA03k000000oanMCAQ_en_US_3",
            "kA03k0000005ym9CAA_en_US_3",
            "kA03k000000oZ8DCAU_en_US_3",
            "kA03k0000003lmlCAA_en_US_3",
            "kA03k000000oZLGCA2_en_US_3",
            "17eGBDtEMqsZNeVKy4iDE0",
            "3m8m9xlM8HzQRjK0NLkIT0",
            "kA03k000000oaevCAA_en_US_3",
            "kA03k0000003ljNCAQ_en_US_3",
            "kA03k000000Vr3SCAS_en_US_3",
            "kA03k0000003ljSCAQ_en_US_3",
            "kA03k000000oZHiCAM_en_US_3",
            "kA03k000000oZ8gCAE_en_US_3",
            "kA03k000000VraRCAS_en_US_3",
            "kA03k000000VrEaCAK_en_US_3",
            "kA03k000000oZLfCAM_en_US_3",
            "kA03k000000Vr38CAC_en_US_3"
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
