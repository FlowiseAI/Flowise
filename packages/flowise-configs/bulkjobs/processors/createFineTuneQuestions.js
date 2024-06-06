const { convertEntryToPlainText } = require('../functions')

const createFineTuneQuestions = {
    name: 'createFineTuneQuestions',
    description: 'Extract questions from articles and store them in a new content type',
    sourceContentTypeId: 'article',
    targetContentTypeId: 'articleFineTunedQuestions',
    locale: 'en-US',
    persona: 'Publisher + Platform Solutions',
    answerAiData: (entry, overrideConfig = {}) => {
        const fieldsToParse = ['glossaryTerms', 'title', 'summary', 'body'];
        const richTextParsingRules = {
            'embedded-asset-block': true,
            'embedded-entry-block': true,
            'embedded-entry-inline': true,
            embeddedContentTypes: {
                table: ['table', 'internalTitle'],
                section: ['contents'],
                text: ['body'],
                media: ['asset'],
                glossaryTerms: ['term', 'definition']
            }
        }
        const plainTextEntry = convertEntryToPlainText(entry, fieldsToParse, richTextParsingRules)

        return {
            question: plainTextEntry,
            chatflowId: '6b5da243-c3b8-4ddf-9076-22178f0d5c65', // Update as necessary
            overrideConfig: {
                ...overrideConfig,
                promptValues: {
                    ...overrideConfig.promptValues
                }
            }
        }
    },
    fieldsProcessor: (response, entry, locale) => {
        const { data, questionType } = response
        const { json } = data

        const { aaiIntent, categories, aaiComplexity } = entry.fields
        const updatedFields = []
        for (let i = 0; i < json.length; i++) {
            const { question, answer } = json[i]
            if (!question) {
                return null
            }

            // Determine the persona based on the categories
            let persona = 'default' // Default persona if none of the conditions match

            const fields = {
                question: {
                    [locale]: question
                },
                answer: {
                    [locale]: answer
                },
                persona: {
                    [locale]: persona
                },
                originalArticle: {
                    [locale]: {
                        sys: {
                            type: 'Link',
                            linkType: 'Entry',
                            id: entry.sys.id
                        }
                    }
                },
                complexity: {
                    [locale]: aaiComplexity
                },
                questionType: {
                    [locale]: questionType
                }
            }
            updatedFields.push(fields)
        }
        return updatedFields
    },
    report: {
        name: 'entryListFieldReport',
        reportDataFields: ['title', 'questions'],
        reportFields: ['Title', 'Questions'],
        reportName: 'Fine-Tune Questions Report',
        reportDescription: 'A report of fine-tune questions extracted from articles'
    }
}

module.exports = createFineTuneQuestions
