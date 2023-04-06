import client from './client'

const sendMessageAndGetPrediction = (id, input) => client.post(`/prediction/${id}`, input)

export default {
    sendMessageAndGetPrediction
}
