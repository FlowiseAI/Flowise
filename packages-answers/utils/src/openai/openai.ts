import {
    Configuration,
    CreateEmbeddingRequestInput,
    OpenAIApi,
    CreateChatCompletionRequest,
    CreateChatCompletionResponse,
    CreateEmbeddingResponse
} from 'openai'

import redisLoader from '../redisLoader'
import DataLoader from 'dataloader'
import { trackChatCompletionUsage, trackEmbeddingUsage } from './usageTracking'
import { User } from 'types'

type LoaderEmbeddingResponse = (CreateEmbeddingResponse & { __redisLoaderCacheHit?: boolean }) | null

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
class OpenAI {
    defaultModel = 'text-embedding-ada-002'
    openai: OpenAIApi
    embeddingsLoader: DataLoader<CreateEmbeddingRequestInput, LoaderEmbeddingResponse>
    constructor() {
        const configuration = new Configuration({
            apiKey: process.env.OPENAI_API_KEY
        })
        this.openai = new OpenAIApi(configuration)
        this.embeddingsLoader = redisLoader({
            keyPrefix: 'v2-openai',
            redisConfig: process.env.REDIS_URL as string,
            disableCache: false,
            getValuesFn: (keys) =>
                Promise.all(
                    keys.map(async (key) =>
                        this.openai
                            .createEmbedding({
                                input: key,
                                model: this.defaultModel
                            })
                            .then(async (res) => res?.data)
                    )
                )
        })
    }

    //TODO: Test if we're hitting rate limits
    // async createEmbeddingBatch(inputs, model = defaultModel) {
    //   try {
    //     const response = await this.openai.createEmbedding({
    //       model,
    //       inputs,
    //     });
    //     const embedding = response?.data?.data[0]?.embedding;
    //     if (!embedding) {
    //       throw new Error("No embedding returned");
    //     }
    //     return embedding;
    //   } catch (error) {
    //     console.error(`Error creating embedding: ${error}`);
    //     throw error;
    //   }
    // }

    async createEmbedding({
        user,
        input,
        model = this.defaultModel
    }: {
        user?: User
        input: CreateEmbeddingRequestInput
        model?: string
    }): Promise<number[]> {
        try {
            const response = await this.embeddingsLoader.load(input)
            if (!user) {
                console.error('No user sent to createEmbedding')
            }

            response &&
                user &&
                trackEmbeddingUsage({
                    method: 'createEmbedding',

                    model,
                    response,
                    user,
                    isCacheHit: !!response.__redisLoaderCacheHit
                })

            return response?.data?.[0]?.embedding || []
        } catch (error) {
            console.error(`Error creating embedding: ${error}`)
            throw error
        }
    }

    async createChatCompletion({ input, user }: { input: CreateChatCompletionRequest; user: User }): Promise<CreateChatCompletionResponse> {
        if (!input.model) {
            input.model = this.defaultModel
        }
        const completion = await this.openai.createChatCompletion(input).catch((error) => {
            throw Error(`Error creating chat completion: ${error?.response?.data?.error?.message || error.message || 'unknown error'}`)
        })
        await trackChatCompletionUsage({
            method: 'createChatCompletion',
            model: completion.data.model,
            request: input,
            response: completion.data,
            user
        })

        return completion.data
    }
}

export default OpenAI
