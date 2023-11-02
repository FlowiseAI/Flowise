import client from './client'

const loadPromptFromHub = (body) => client.post(`/load-prompt`, body)

export default {
    loadPromptFromHub
}
