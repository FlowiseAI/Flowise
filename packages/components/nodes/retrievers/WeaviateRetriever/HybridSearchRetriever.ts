import { WeaviateStore } from '@langchain/weaviate'
import { VectorStoreRetriever, VectorStoreRetrieverInput } from '@langchain/core/vectorstores'
import { Document } from '@langchain/core/documents'
import { get } from 'lodash'

type WeaviateHybridInput<V extends WeaviateStore> = Omit<VectorStoreRetrieverInput<V>, 'k'> & {
    alpha: number
    topK: number
    resultFormat?: string
    fusionType?: string
}

export class HybridSearchRetriever<V extends WeaviateStore> extends VectorStoreRetriever<V> {
    resultFormat: string
    alpha: number
    topK: number
    fusionType: string

    constructor(input: WeaviateHybridInput<V>) {
        super(input)
        this.vectorStore = input.vectorStore
        this.alpha = input.alpha
        this.topK = input.topK
        this.fusionType = input.fusionType ?? 'RelativeScore'
    }

    async _getRelevantDocuments(query: string): Promise<Document[]> {
        const results = await this.vectorStore.hybridSearch(query, {
            limit: this.topK,
            alpha: this.alpha,
            fusionType: this.fusionType,
            filters: this.filter
        })
        if (this.resultFormat != undefined) {
            return results.map((doc) => {
                let resContent = this.resultFormat.replace(/{{context}}/g, doc.pageContent)
                resContent = replaceMetadata(resContent, doc.metadata)

                return new Document({
                    pageContent: resContent,
                    metadata: doc.metadata
                })
            })
        } else {
            return results
        }
    }

    static fromVectorStore<V extends WeaviateStore>(vectorStore: V, options: Omit<WeaviateHybridInput<V>, 'vectorStore'>) {
        return new this<V>({ ...options, vectorStore })
    }
}

function replaceMetadata(template: string, metadata: Record<string, any>): string {
    const metadataRegex = /{{metadata\.([\w.]+)}}/g
    return template.replace(metadataRegex, (match, path) => {
        const value = get(metadata, path)
        return value !== undefined ? String(value) : match
    })
}

export const processSearchFilter = (filterInput: any, client: any, indexName: string) => {
    if (!filterInput) return undefined
    let rawFilter = filterInput?.where ?? filterInput

    if (rawFilter.operator === 'And' || rawFilter.operator === 'Or') {
        const subFilters = rawFilter.operands?.map((operand: any) => processSearchFilter(operand, client, indexName)).filter(Boolean)

        if (!subFilters?.length) return undefined

        return rawFilter.operator === 'And'
            ? subFilters.reduce((acc: any, f: any) => acc.and(f))
            : subFilters.reduce((acc: any, f: any) => acc.or(f))
    }

    if (rawFilter?.path && rawFilter?.operator) {
        const propName = Array.isArray(rawFilter.path) ? rawFilter.path[0] : rawFilter.path
        const operator = rawFilter.operator
        const propValue =
            rawFilter.valueText ??
            rawFilter.valueString ??
            rawFilter.valueInt ??
            rawFilter.valueNumber ??
            rawFilter.valueBoolean ??
            rawFilter.valueDate ??
            rawFilter.valueTextArray ??
            rawFilter.valueStringArray ??
            rawFilter.valueIntArray ??
            rawFilter.valueNumberArray ??
            rawFilter.valueBooleanArray ??
            rawFilter.valueDateArray

        const filter = client.collections.get(indexName).filter.byProperty(propName)

        const operatorMap: Record<string, (v: any) => any> = {
            Equal: (v) => filter.equal(v),
            NotEqual: (v) => filter.notEqual(v),
            GreaterThan: (v) => filter.greaterThan(v),
            GreaterThanEqual: (v) => filter.greaterOrEqual(v),
            LessThan: (v) => filter.lessThan(v),
            LessThanEqual: (v) => filter.lessOrEqual(v),
            Like: (v) => filter.like(v),
            ContainsAny: (v) => filter.containsAny(v),
            ContainsAll: (v) => filter.containsAll(v)
        }

        return operatorMap[operator]?.(propValue)
    }

    return undefined
}
