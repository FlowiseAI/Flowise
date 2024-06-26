const contentful = require('contentful')
const contentfulManagement = require('contentful-management')
const axios = require('axios')

const config = {
    spaceId: process.env.CONTENTFUL_SPACE_ID,
    environmentId: process.env.CONTENTFUL_ENVIRONMENT_ID,
    deliveryToken: process.env.CONTENTFUL_DELIIVERY_TOKEN,
    managementToken: process.env.CONTENTFUL_MANAGEMENT_TOKEN
}
// Client configurations for Contentful and Contentful Management
const contentfulClient = contentful.createClient({
    space: config.spaceId,
    environment: config.environmentId,
    accessToken: config.deliveryToken
})

const managementClient = contentfulManagement.createClient(
    {
        accessToken: config.managementToken
    },
    { type: 'plain' }
)

async function fetchEntries(sourceContentTypeId, filters = {}, skip = 0, allEntries = []) {
    const response = await contentfulClient.getEntries({
        ...filters,
        content_type: sourceContentTypeId,
        include: 3,
        skip
    })

    allEntries.push(...response.items)

    if (response.total > allEntries.length) {
        return fetchEntries(sourceContentTypeId, filters, allEntries.length, allEntries)
    }

    return allEntries
}

async function createFineTuneEntries(originalEntry, fineTuneEntries, targetContentTypeId, processor, questionType) {
    for (let i = 0; i < fineTuneEntries.length; i++) {
        try {
            const fineTuneEntry = fineTuneEntries[i]
            const fields = {
                question: { 'en-US': fineTuneEntry.question },
                answer: { 'en-US': fineTuneEntry.answer },
                questionType: { 'en-US': questionType.type },
                persona: { 'en-US': processor.persona },
                originalArticle: {
                    'en-US': {
                        sys: {
                            type: 'Link',
                            linkType: 'Entry',
                            id: originalEntry.sys.id
                        }
                    }
                }
            }

            const entry = await managementClient.entry.create(
                {
                    spaceId: process.env.CONTENTFUL_SPACE_ID,
                    environmentId: process.env.CONTENTFUL_ENVIRONMENT_ID,
                    contentTypeId: targetContentTypeId
                },
                { fields }
            )

            await managementClient.entry.publish(
                {
                    spaceId: process.env.CONTENTFUL_SPACE_ID,
                    environmentId: process.env.CONTENTFUL_ENVIRONMENT_ID,
                    entryId: entry.sys.id
                },
                { ...entry }
            )

            await new Promise((resolve) => setTimeout(resolve, 100))

            console.log(`Created ${targetContentTypeId} entry, ${entry.sys.id}, ${originalEntry.sys.id}, ${questionType.type}`)
        } catch (err) {
            console.error(`Error creating ${targetContentTypeId} entry in Contentful, ${originalEntry.sys.id}, ${questionType.type}`)
        }
    }
}

async function processBatch(entries, processor, questionType) {
    const tasks = entries.map((entry) => {
        return async () => {
            try {
                const question = processor.promptProcessor(entry)
                const response = await axios.post(`${process.env.ANSWERAI_API_HOST}/api/v1/prediction/${processor.chatflowId}`, {
                    question,
                    overrideConfig: {
                        promptValues: {
                            questionType: `${questionType.type}: ${questionType.description}`,
                            numberOfQuestions: 5
                        }
                    }
                })

                if (response.status === 200) {
                    await createFineTuneEntries(entry, response.data.json, processor.targetContentTypeId, processor, questionType)
                } else {
                    console.error(`Failed to save a question for entry, ${entry.sys.id}, ${questionType.type}`)
                }
            } catch (error) {
                console.error(`Error getting AI response for entry, ${entry.sys.id}, ${questionType.type}`)
            }
        }
    })

    await Promise.all(tasks.map((task) => task()))
}

async function processEntriesInBatches(processor, questionType) {
    const batchSize = 5

    // Fetch all entries once
    const allEntries = await fetchEntries(processor.sourceContentTypeId, processor?.filter, 0, []) // Adjust the last number based on expected maximum entries

    // Filter entries by persona
    const filteredEntries = allEntries.filter((entry) =>
        entry.fields?.categories?.some((category) => category.fields?.internalTitle.includes(processor.persona))
    )

    // Process entries in batches
    for (let skip = 0; skip < filteredEntries.length; skip += batchSize) {
        const batch = filteredEntries.slice(skip, skip + batchSize)
        await processBatch(batch, processor, questionType)
    }

    console.log(
        `Finished processing ${processor.sourceContentTypeId} entries for ${questionType.type} with ${filteredEntries.length} entries`
    )
}

module.exports = { processEntriesInBatches }
