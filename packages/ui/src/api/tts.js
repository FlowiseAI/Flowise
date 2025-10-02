import client from './client'

const abortTTS = (body) => client.post('/text-to-speech/abort', body)

const generateVoice = (body) =>
    client.post('/text-to-speech/generate', body, {
        responseType: 'arraybuffer'
    })

const listVoices = (params) => client.get('/text-to-speech/voices', { params })

export default {
    abortTTS,
    generateVoice,
    listVoices
}
