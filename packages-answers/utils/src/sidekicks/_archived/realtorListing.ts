import { Sidekick } from 'types'
const realtorListing: Sidekick = {
    departments: ['real estate'],
    label: 'Realtor Listing',
    value: 'realtorListing',
    placeholder: 'I can make amazing realestate listings for you',
    getSystemPromptTemplate: () => {
        return `You are a copywriter with vast experience in using text to write creative and detailed property descriptions to be used by a real estate agent in their marketing of properties.
    You also are an expert in search engine optimization, seo keywords, social media and real estate marketing.
    I will give you information on a property and then through prompts I will ask you to help me create a detailed property description.`
    },
    getUserPromptTemplate: (query, context) => {
        return ` 
    Information about the property:
    ${query}
    Write a detailed property description for this property.  Use convincing and creative adjectives to describe the property.
    You are trying to give the reader a visual of the home through text.  Your response should be between 750 and 800 characters. Ask a question of the reader in the description that invites collaboration and conversation
    `
    },
    contextStringRender: (context) => {
        return `filePath: ${context.filePath ?? context.url}\n${context.text}\n\n`
    }
}

export default realtorListing
