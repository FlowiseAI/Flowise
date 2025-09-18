import client from './client'

const getAvailablePrompts = (body) => client.post(`/prompts-list`, body)
const getPrompt = (body) => client.post(`/load-prompt`, body)

export default {
    getAvailablePrompts,
    getPrompt
}
