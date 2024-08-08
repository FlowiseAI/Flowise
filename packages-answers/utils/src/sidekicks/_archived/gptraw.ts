import { Sidekick } from 'types'

const gptraw: Sidekick = {
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
    label: 'ChatGPT',
    value: 'gptraw',
    placeholder: 'Just like ChatGPT, but more model control. Does not use context.',
    getUserPromptTemplate: (query) => {
        return query
    },
    contextStringRender: (context) => {
        return `filePath: ${context.filePath ?? context.url}\n${context.text}\n\n`
    }
}

export default gptraw
