import client from './client'

const sendMessageAndGetPrediction = (id, input) => client.post(`/internal-prediction/${id}`, input)

export default {
    sendMessageAndGetPrediction
}
