import client from './client'

const sendMessageAndGetPrediction = (id, input) => client.post(`/internal-prediction/${id}`, input)
const sendMessageAndStreamPrediction = (id, input) => client.post(`/internal-prediction/stream/${id}`, input)

export default {
    sendMessageAndGetPrediction,
    sendMessageAndStreamPrediction
}
