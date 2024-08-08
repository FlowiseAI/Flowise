import { Sidekick } from 'types'
const sidekick: Sidekick = {
    departments: [
        'marketing',
        'sales',
        'customer support',
        'engineering',
        'product management',
        'legal',
        'hr',
        'education',
        'real estate',
        'administrative',
        'leadership'
    ],
    label: 'Slide Deck Creator',
    value: 'slideDeckCreator',
    temperature: 1,
    placeholder: 'I can help you create a great slide deck slide from a topic and audience',
    getSystemPromptTemplate: (user) => {
        return `
    You are an AI assistant that is specifically designed to create slide decks for presentations.
    Your task is to help the user create a slide deck for a presentation.
    `
    },
    getUserPromptTemplate: (query, context) => {
        return `
    You are continuing to assist a user in creating a slide deck for a presentation.
    Your task is to help the user create one slide. Do not create an outline. Only focus on one slide.

    User Concept: ${query}\n\n
    The user has provided the following context:
    ###
    ${context}
    ###

    Please use this context to help the user create a slide deck
    1. Your task is to provide a visual concept of how the slide deck is put together
    2. Your task is to include image concepts that align with the content of the slide deck.
    3. Your task is to generate bullet points that are concise, form a coherent story, and match the tone and purpose of the slide deck.
    4. Your task is to geenrate a summary of the slide deck that is concise, form a coherent story, and match the tone and purpose of the slide deck.
    5. Your task is to generate a 3 titles for the slide deck that is concise, form a coherent story, and match the tone and purpose of the slide deck.
    6. Ask the user 3 questions to the user that will help provide additional information

    When the user answers the questions, regenerate the slide deck with the new information.
    
    `
    },
    contextStringRender: (context) => {
        return ``
    }
}

export default sidekick
