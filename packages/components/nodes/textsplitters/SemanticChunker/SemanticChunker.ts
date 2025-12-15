import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { Document } from '@langchain/core/documents'
import { Embeddings } from '@langchain/core/embeddings'
import { TextSplitter } from '@langchain/textsplitters'

interface SemanticChunkerParams {
    embeddings: Embeddings
    breakpointThresholdType?: 'percentile' | 'standard_deviation' | 'interquartile'
    breakpointThresholdAmount?: number
    bufferSize?: number
}

/**
 * Custom Semantic Chunker implementation
 * Splits text based on semantic meaning using embeddings
 */
class SemanticTextSplitter extends TextSplitter {
    embeddings: Embeddings
    breakpointThresholdType: 'percentile' | 'standard_deviation' | 'interquartile'
    breakpointThresholdAmount: number
    bufferSize: number

    constructor(params: SemanticChunkerParams) {
        super({ chunkSize: 1000, chunkOverlap: 0 })
        this.embeddings = params.embeddings
        this.breakpointThresholdType = params.breakpointThresholdType || 'percentile'
        this.breakpointThresholdAmount = params.breakpointThresholdAmount || 95
        this.bufferSize = params.bufferSize || 1
    }

    async splitText(text: string): Promise<string[]> {
        // Split text into sentences
        const sentences = this.splitIntoSentences(text)
        
        if (sentences.length === 0) {
            return []
        }

        if (sentences.length === 1) {
            return sentences
        }

        // Combine sentences with buffer
        const combinedSentences: string[] = []
        for (let i = 0; i < sentences.length; i++) {
            const startIdx = Math.max(0, i - this.bufferSize)
            const endIdx = Math.min(sentences.length, i + this.bufferSize + 1)
            const combined = sentences.slice(startIdx, endIdx).join(' ')
            combinedSentences.push(combined)
        }

        // Get embeddings for combined sentences
        const embeddings = await this.embeddings.embedDocuments(combinedSentences)

        // Calculate cosine similarities between adjacent sentences
        const similarities: number[] = []
        for (let i = 0; i < embeddings.length - 1; i++) {
            const similarity = this.cosineSimilarity(embeddings[i], embeddings[i + 1])
            similarities.push(similarity)
        }

        // Calculate breakpoint threshold
        const threshold = this.calculateThreshold(similarities)

        // Identify breakpoints where similarity is below threshold
        const breakpoints: number[] = [0]
        for (let i = 0; i < similarities.length; i++) {
            if (similarities[i] < threshold) {
                breakpoints.push(i + 1)
            }
        }
        breakpoints.push(sentences.length)

        // Create chunks based on breakpoints
        const chunks: string[] = []
        for (let i = 0; i < breakpoints.length - 1; i++) {
            const start = breakpoints[i]
            const end = breakpoints[i + 1]
            const chunk = sentences.slice(start, end).join(' ')
            if (chunk.trim()) {
                chunks.push(chunk)
            }
        }

        return chunks
    }

    private splitIntoSentences(text: string): string[] {
        // Simple sentence splitter using common punctuation
        const sentences = text
            .replace(/([.!?])\s+/g, '$1|')
            .split('|')
            .map((s) => s.trim())
            .filter((s) => s.length > 0)

        return sentences
    }

    private cosineSimilarity(vec1: number[], vec2: number[]): number {
        if (vec1.length !== vec2.length) {
            throw new Error('Vectors must have the same length')
        }

        let dotProduct = 0
        let magnitude1 = 0
        let magnitude2 = 0

        for (let i = 0; i < vec1.length; i++) {
            dotProduct += vec1[i] * vec2[i]
            magnitude1 += vec1[i] * vec1[i]
            magnitude2 += vec2[i] * vec2[i]
        }

        magnitude1 = Math.sqrt(magnitude1)
        magnitude2 = Math.sqrt(magnitude2)

        if (magnitude1 === 0 || magnitude2 === 0) {
            return 0
        }

        return dotProduct / (magnitude1 * magnitude2)
    }

    private calculateThreshold(similarities: number[]): number {
        if (similarities.length === 0) {
            return 0
        }

        switch (this.breakpointThresholdType) {
            case 'percentile': {
                const sorted = [...similarities].sort((a, b) => a - b)
                const index = Math.floor((this.breakpointThresholdAmount / 100) * sorted.length)
                return sorted[Math.min(index, sorted.length - 1)]
            }
            case 'standard_deviation': {
                const mean = similarities.reduce((a, b) => a + b, 0) / similarities.length
                const variance = similarities.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / similarities.length
                const stdDev = Math.sqrt(variance)
                return mean - this.breakpointThresholdAmount * stdDev
            }
            case 'interquartile': {
                const sorted = [...similarities].sort((a, b) => a - b)
                const q1Index = Math.floor(0.25 * sorted.length)
                const q3Index = Math.floor(0.75 * sorted.length)
                const q1 = sorted[q1Index]
                const q3 = sorted[q3Index]
                const iqr = q3 - q1
                return q1 - this.breakpointThresholdAmount * iqr
            }
            default:
                return 0
        }
    }
}

class SemanticChunker_TextSplitters implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'Semantic Chunker'
        this.name = 'semanticChunker'
        this.version = 1.0
        this.type = 'SemanticChunker'
        this.icon = 'semanticChunker.svg'
        this.category = 'Text Splitters'
        this.description = 'Split text based on semantic meaning using embeddings to identify natural breakpoints'
        this.baseClasses = [this.type, ...getBaseClasses(SemanticTextSplitter)]
        this.inputs = [
            {
                label: 'Embeddings',
                name: 'embeddings',
                type: 'Embeddings',
                description: 'Embeddings model to use for semantic analysis'
            },
            {
                label: 'Breakpoint Threshold Type',
                name: 'breakpointThresholdType',
                type: 'options',
                description: 'Method to calculate breakpoint threshold for splitting',
                options: [
                    {
                        label: 'Percentile',
                        name: 'percentile',
                        description: 'Use percentile of similarities'
                    },
                    {
                        label: 'Standard Deviation',
                        name: 'standard_deviation',
                        description: 'Use standard deviation from mean'
                    },
                    {
                        label: 'Interquartile',
                        name: 'interquartile',
                        description: 'Use interquartile range'
                    }
                ],
                default: 'percentile',
                optional: true
            },
            {
                label: 'Breakpoint Threshold Amount',
                name: 'breakpointThresholdAmount',
                type: 'number',
                description: 'Threshold value for the selected type (e.g., 95 for 95th percentile)',
                default: 95,
                optional: true
            },
            {
                label: 'Buffer Size',
                name: 'bufferSize',
                type: 'number',
                description: 'Number of sentences to combine when calculating embeddings (context window)',
                default: 1,
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const embeddings = nodeData.inputs?.embeddings as Embeddings
        const breakpointThresholdType = nodeData.inputs?.breakpointThresholdType as
            | 'percentile'
            | 'standard_deviation'
            | 'interquartile'
        const breakpointThresholdAmount = nodeData.inputs?.breakpointThresholdAmount as string
        const bufferSize = nodeData.inputs?.bufferSize as string

        if (!embeddings) {
            throw new Error('Embeddings is required for Semantic Chunker')
        }

        const params: SemanticChunkerParams = {
            embeddings
        }

        if (breakpointThresholdType) {
            params.breakpointThresholdType = breakpointThresholdType
        }

        if (breakpointThresholdAmount) {
            params.breakpointThresholdAmount = parseFloat(breakpointThresholdAmount)
        }

        if (bufferSize) {
            params.bufferSize = parseInt(bufferSize, 10)
        }

        const splitter = new SemanticTextSplitter(params)

        return splitter
    }
}

module.exports = { nodeClass: SemanticChunker_TextSplitters }
