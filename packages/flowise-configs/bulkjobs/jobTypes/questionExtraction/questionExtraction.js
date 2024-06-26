const questionPrompts = require('./questionPrompts')
function getQuestionPromptsForArticle(articleTypes) {
    const taxonomyMap = {
        Tutorial: ['procedural-questions', 'exploratory-questions', 'scenario-based-questions'],
        FAQ: ['fact-based-questions', 'yes-no-questions', 'multiple-choice-questions'],
        'Troubleshooting Guide': ['problem-solving-questions', 'scenario-based-questions', 'procedural-questions'],
        'Release Notes': ['fact-based-questions', 'comparative-questions', 'exploratory-questions'],
        'Policy & Billing Overview': ['fact-based-questions', 'yes-no-questions', 'comparative-questions'],
        Glossary: ['fact-based-questions', 'exploratory-questions'],
        'Embedded Content': ['exploratory-questions', 'scenario-based-questions', 'multiple-choice-questions']
    }

    // Set to store unique question types
    let uniqueQuestionTypes = new Set();

    // Iterate over each article type provided
    articleTypes.forEach((type) => {
        const questions = taxonomyMap[type]
        if (questions) {
            questions.forEach((questionType) => uniqueQuestionTypes.add(questionType))
        }
    });

    // Convert unique question types to an array and map to include prompts
    return Array.from(uniqueQuestionTypes).map((type) => ({
        prompt: questionPrompts[type].prompt,
        type: type
    }))
}
const {
    fetchEntriesFromContentful,
    processDocumentsWithAnswerAI,
    processContentEntries,
    createEntryListFieldReport
} = require('../../functions')

const questionExtraction = async (processor) => {
    try {
        const entries = await fetchEntriesFromContentful(processor.sourceContentTypeId, processor?.filters)
        // Filter entries to include only those with "Publisher + Platform" in the internal title of any category
        const filteredEntries = entries.filter((entry) =>
            entry.fields?.categories?.some((category) => category.fields.internalTitle.includes('Advertiser + Agency Solutions'))
        )

        let questionsTypeMap = {}
        // Create a map of question types to entries
        for (let entry of filteredEntries) {
            const questionPrompts = getQuestionPromptsForArticle(entry.fields.aaiTypeOfArticle)
            questionPrompts.forEach(({ type }) => {
                if (!questionsTypeMap[type]) {
                    questionsTypeMap[type] = []
                }
                questionsTypeMap[type].push(entry)
            })
        }

        let answerAiResponses = [];
        // Process each question type
        for (let type in questionsTypeMap) {
            const entriesForType = questionsTypeMap[type]
            console.log(`Processing ${type} questions for ${entriesForType.length} entries`);
            const questionPrompt = questionPrompts[type].prompt // Ensure you have a default prompt or handling for missing types

            const responses = await processDocumentsWithAnswerAI(entriesForType, processor, {
                promptValues: {
                    instructions: questionPrompt
                }
            })

            // Add the question type to each response and collect them
            const typedResponses = responses.map((response) => ({
                ...response,
                response: {
                    ...response.response,
                    questionType: type
                }
            }))
            answerAiResponses.push(...typedResponses)
        }

        const { processedContentfulEntries, errors } = await processContentEntries(processor, answerAiResponses)

        const report = await createEntryListFieldReport(processor, processedContentfulEntries, errors)
    } catch (error) {
        console.error('Error processing entries', error)
    }
}

module.exports = questionExtraction
