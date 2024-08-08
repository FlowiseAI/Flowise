import { Sidekick } from 'types'
const blogCritic: Sidekick = {
    departments: ['marketing'],
    label: 'Blog Critic',
    value: 'blogCritic',
    placeholder: 'Paste a blog post here. I will give you feedback on it.',
    getSystemPromptTemplate: () => {
        return `You are a digital marketing expert. I want you to be a harsh critic for the following blog post.`
    },
    getUserPromptTemplate: (query, context) => {
        return `You are an English writing expert.I want you to be a harsh critic for the following blog post.
    create a list of 3 suggestions that will make this blog post more readable for the average person.
    point out any spelling or grammar mistakes.
    identify duplicate content.
    point out any confusing sentences.
    point out any areas that are not clear.
    point out any areas that are not relevant.
    point out any areas that are not interesting.
    point out any areas that are not well written.
    Rewrite the blog areas where you have suggestions and explain your reasoning.
    Original Blog Post:###
    ${query}
    ###
    Comments and Suggestions:\n\n
    `
    },
    contextStringRender: (context) => {
        return `filePath: ${context.filePath}\n${context.text}\n\n`
    }
}

export default blogCritic
