import { INodeData } from '../../src'

export const resolveVectorStoreOrRetriever = (nodeData: INodeData, vectorStore: any) => {
    const output = nodeData.outputs?.output as string
    const searchType = nodeData.outputs?.searchType as string
    const topK = nodeData.inputs?.topK as string
    const k = topK ? parseFloat(topK) : 4

    if (output === 'retriever') {
        if ('mmr' === searchType) {
            const fetchK = nodeData.inputs?.fetchK as string
            const lambda = nodeData.inputs?.lambda as string
            const f = fetchK ? parseInt(fetchK) : 20
            const l = lambda ? parseFloat(lambda) : 0.5
            return vectorStore.asRetriever({
                searchType: 'mmr',
                k: k,
                searchKwargs: {
                    fetchK: f,
                    lambda: l
                }
            })
        } else {
            // "searchType" is "similarity"
            return vectorStore.asRetriever(k)
        }
    } else if (output === 'vectorStore') {
        ;(vectorStore as any).k = k
        return vectorStore
    }
}

export const addMMRInputParams = (inputs: any[]) => {
    const mmrInputParams = [
        {
            label: 'Search Type',
            name: 'searchType',
            type: 'options',
            default: 'similarity',
            options: [
                {
                    label: 'Similarity',
                    name: 'similarity'
                },
                {
                    label: 'Max Marginal Relevance',
                    name: 'mmr'
                }
            ],
            additionalParams: true,
            optional: true
        },
        {
            label: 'Fetch K (for MMR Search)',
            name: 'fetchK',
            description: 'Number of initial documents to fetch for MMR reranking. Default to 20. Used only when the search type is MMR',
            placeholder: '20',
            type: 'number',
            additionalParams: true,
            optional: true
        },
        {
            label: 'Lambda (for MMR Search)',
            name: 'lambda',
            description:
                'Number between 0 and 1 that determines the degree of diversity among the results, where 0 corresponds to maximum diversity and 1 to minimum diversity. Used only when the search type is MMR',
            placeholder: '0.5',
            type: 'number',
            additionalParams: true,
            optional: true
        }
    ]

    inputs.push(...mmrInputParams)
}
