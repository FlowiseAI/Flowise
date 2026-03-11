import type { AxiosInstance } from 'axios'

export const createPredictionsApi = (client: AxiosInstance) => ({
    sendMessageAndGetPrediction: (id: string, input: Record<string, unknown>) => client.post(`/internal-prediction/${id}`, input),
    sendMessageAndStreamPrediction: (id: string, input: Record<string, unknown>) => client.post(`/internal-prediction/stream/${id}`, input),
    sendMessageAndGetPredictionPublic: (id: string, input: Record<string, unknown>) => client.post(`/prediction/${id}`, input)
})

export type PredictionsApi = ReturnType<typeof createPredictionsApi>
