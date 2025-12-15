import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { Embeddings } from '@langchain/core/embeddings'

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
class SemanticTextSplitter extends RecursiveCharacterTextSplitter {
    embeddings: Embeddings
    breakpointThresholdType: 'percentile' | 'standard_deviation' | 'interquartile'
    breakpointThresholdAmount: number
    bufferSize: number

    constructor(params: SemanticChunkerParams) {
        super({ chunkSize: 1000, chunkOverlap: 0 })
        this.embeddings = params.embeddings
        this.breakpointThresholdType = params.breakpointThresholdType || 'percentile'
        this.breakpointThresholdAmount = params.breakpointThresholdAmount || 50
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
        // More robust sentence splitter that handles common edge cases
        // Split on sentence-ending punctuation followed by whitespace and uppercase letter
        // or end of string, while avoiding common abbreviations
        const sentences: string[] = []
        
        // Replace common abbreviations temporarily to avoid false splits
        const abbreviations = ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.', 'Sr.', 'Jr.', 'etc.', 'e.g.', 'i.e.', 'vs.', 'Inc.', 'Ltd.', 'Co.']
        let processedText = text
        const abbrevMap: { [key: string]: string } = {}
        
        abbreviations.forEach((abbr, idx) => {
            const placeholder = `__ABBR${idx}__`
            abbrevMap[placeholder] = abbr
            // Escape regex special characters
            const escapedAbbr = abbr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            processedText = processedText.replace(new RegExp(escapedAbbr, 'g'), placeholder)
        })
        
        // Split on sentence boundaries: .!? followed by space and capital letter, or end of text
        const parts = processedText.split(/([.!?]+)(\s+|$)/)
        
        let currentSentence = ''
        for (let i = 0; i < parts.length; i += 3) {
            const text = parts[i] || ''
            const punct = parts[i + 1] || ''
            const space = parts[i + 2] || ''
            
            currentSentence += text + punct
            
            // Check if next part starts with uppercase (indicates new sentence)
            const nextPart = parts[i + 3] || ''
            if (punct && (space.trim() === '' || /^[A-Z]/.test(nextPart) || i + 3 >= parts.length)) {
                // Restore abbreviations
                Object.keys(abbrevMap).forEach((placeholder) => {
                    currentSentence = currentSentence.replace(new RegExp(placeholder, 'g'), abbrevMap[placeholder])
                })
                
                const trimmed = currentSentence.trim()
                if (trimmed) {
                    sentences.push(trimmed)
                }
                currentSentence = ''
            }
        }
        
        // Handle any remaining text
        if (currentSentence.trim()) {
            Object.keys(abbrevMap).forEach((placeholder) => {
                currentSentence = currentSentence.replace(new RegExp(placeholder, 'g'), abbrevMap[placeholder])
            })
            sentences.push(currentSentence.trim())
        }
        
        // Fallback: if no sentences found, try simple split
        if (sentences.length === 0) {
            return text
                .replace(/([.!?])\s+/g, '$1|')
                .split('|')
                .map((s) => s.trim())
                .filter((s) => s.length > 0)
        }

        return sentences.filter((s) => s.length > 0)
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
                // For percentile, we find the threshold below which we consider a breakpoint
                // Lower percentile = more aggressive splitting (more breakpoints)
                // Higher percentile = less aggressive splitting (fewer breakpoints)
                const sorted = [...similarities].sort((a, b) => a - b)
                const percentile = Math.max(0, Math.min(100, this.breakpointThresholdAmount)) / 100
                const index = Math.floor(percentile * sorted.length)
                // Handle edge cases: ensure we have a valid index
                const safeIndex = Math.max(0, Math.min(index, sorted.length - 1))
                return sorted[safeIndex]
            }
            case 'standard_deviation': {
                const mean = similarities.reduce((a, b) => a + b, 0) / similarities.length
                const variance = similarities.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / similarities.length
                const stdDev = Math.sqrt(variance)
                return mean - this.breakpointThresholdAmount * stdDev
            }
            case 'interquartile': {
                const sorted = [...similarities].sort((a, b) => a - b)
                if (sorted.length < 4) {
                    // For very small arrays, fall back to simple threshold
                    return sorted[0]
                }
                const q1Index = Math.max(0, Math.min(Math.floor(0.25 * sorted.length), sorted.length - 1))
                const q3Index = Math.max(0, Math.min(Math.floor(0.75 * sorted.length), sorted.length - 1))
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
        this.version = 1
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
                description: 'Threshold value for the selected type. For percentile: lower values = more splits (try 25-50 for balanced splitting)',
                default: 50,
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
            const parsed = parseFloat(breakpointThresholdAmount)
            if (!isNaN(parsed)) {
                // For percentile, validate 0-100 range
                if (breakpointThresholdType === 'percentile' && (parsed < 0 || parsed > 100)) {
                    // Use default if out of range
                    params.breakpointThresholdAmount = 50
                } else {
                    params.breakpointThresholdAmount = parsed
                }
            }
        }

        if (bufferSize) {
            const parsed = parseInt(bufferSize, 10)
            if (!isNaN(parsed) && parsed >= 0) {
                params.bufferSize = parsed
            }
        }

        const splitter = new SemanticTextSplitter(params)

        return splitter
    }
}

module.exports = { nodeClass: SemanticChunker_TextSplitters }
