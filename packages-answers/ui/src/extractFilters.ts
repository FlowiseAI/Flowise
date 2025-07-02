import { AnswersFilters } from 'types'
import { openai } from '@utils/openai/client'
async function extractFilters(prompt: string, filters: AnswersFilters) {
    const { data } = await openai.createCompletion({
        model: 'text-davinci-003',
        prompt: `
          Return the filters as a valid JSON object included in the following question. All keys and values must be lowercase. Reply format can be like:
          { "project":"<project>", "status_category": "<status_category>" }
          Only return from the available fields if you know the value: project
          Question: ${prompt}`,
        max_tokens: 700,
        temperature: 0.1,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
    }) // Get the recommended changes from the API response\
    let filtersResponse = data.choices[0].text

    if (filtersResponse) {
        filtersResponse = filtersResponse?.replace(/\\n/g, '')?.trim()
        try {
            const regex = /{.*}/s
            const match = filtersResponse.match(regex)
            // console.log('Parsing AI Filter', { filtersResponse, match })
            if (match) {
                filters = JSON.parse(match[0])
                // console.log('Using AI Filter:', filters)
            }
        } catch (error) {
            console.log('PINECONE ERROR: Could not parse filters', error)
        }
    }
    return filters
}
