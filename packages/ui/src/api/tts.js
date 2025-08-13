import client from './client'

const generateVoice = (body) => client.post('/text-to-speech/generate', body)

const listVoices = (params) => client.get('/text-to-speech/voices', { params })

export default {
    generateVoice,
    listVoices
}
