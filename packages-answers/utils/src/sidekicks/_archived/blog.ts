import { Sidekick } from 'types'
const blog: Sidekick = {
    departments: ['marketing'],
    label: 'Blog Creator',
    value: 'blog',
    placeholder: 'Ask me to write a blog or iterate on a part of it. I will write it for you.',
    getSystemPromptTemplate: () => {
        return `You are writing expert. You assist people in writing better blog posts.`
    },
    getUserPromptTemplate: (query, context) => {
        return `You are assisting someone in writing a blog post.
    
    Use this context to help you when creating your response:
    ###
    ${context}
    ###

    The user now wants you to write this: ${query}

    Write the blog post for the user.
    `
    },
    contextStringRender: (context) => {
        return `filePath: ${context.filePath ?? context.url}\n${context.text}\n\n`
    }
}

export default blog
