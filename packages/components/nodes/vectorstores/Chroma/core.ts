import { Chroma, ChromaLibArgs } from 'langchain/vectorstores/chroma'
import { Embeddings } from 'langchain/embeddings/base'
import type { Collection } from 'chromadb'

interface ChromaAuth {
    chromaApiKey?: string
}

export class ChromaExtended extends Chroma {
    chromaApiKey?: string

    constructor(embeddings: Embeddings, args: ChromaLibArgs & Partial<ChromaAuth>) {
        super(embeddings, args)
        this.chromaApiKey = args.chromaApiKey
    }

    static async fromExistingCollection(embeddings: Embeddings, dbConfig: ChromaLibArgs & Partial<ChromaAuth>): Promise<Chroma> {
        const instance = new this(embeddings, dbConfig)
        await instance.ensureCollection()
        return instance
    }

    async ensureCollection(): Promise<Collection> {
        if (!this.collection) {
            if (!this.index) {
                const { ChromaClient } = await Chroma.imports()
                const obj: any = {
                    path: this.url
                }
                if (this.chromaApiKey) {
                    obj.fetchOptions = {
                        headers: {
                            'X-Api-Key': this.chromaApiKey
                        }
                    }
                }
                this.index = new ChromaClient(obj)
            }
            try {
                this.collection = await this.index.getOrCreateCollection({
                    name: this.collectionName
                })
            } catch (err) {
                throw new Error(`Chroma getOrCreateCollection error: ${err}`)
            }
        }
        return this.collection
    }
}
