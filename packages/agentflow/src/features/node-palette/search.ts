import type { NodeData } from '@/core'
import { groupNodesByCategory } from '@/core'

export { groupNodesByCategory }

/**
 * Calculate fuzzy search score between search term and target text
 * Higher scores indicate better matches
 */
export function fuzzyScore(searchTerm: string, text: string): number {
    const search = ((searchTerm ?? '') + '').trim().toLowerCase()
    if (!search) return 0
    const target = ((text ?? '') + '').toLowerCase()

    let score = 0
    let searchIndex = 0
    let firstMatchIndex = -1
    let lastMatchIndex = -1
    let consecutiveMatches = 0

    // Check for exact substring match
    const exactMatchIndex = target.indexOf(search)
    if (exactMatchIndex !== -1) {
        score = 1000
        // Bonus for match at start of string
        if (exactMatchIndex === 0) {
            score += 200
        }
        // Bonus for match at start of word
        else if (target[exactMatchIndex - 1] === ' ' || target[exactMatchIndex - 1] === '-' || target[exactMatchIndex - 1] === '_') {
            score += 100
        }
        // Penalty for how far into the string the match is
        score -= exactMatchIndex * 2
        // Penalty for length difference (shorter target = better match)
        score -= (target.length - search.length) * 3
        return score
    }

    // Fuzzy matching with character-by-character scoring
    for (let i = 0; i < target.length && searchIndex < search.length; i++) {
        if (target[i] === search[searchIndex]) {
            // Base score for character match
            score += 10

            // Bonus for consecutive matches
            if (lastMatchIndex === i - 1) {
                consecutiveMatches++
                score += 5 + consecutiveMatches * 2 // Increasing bonus for longer sequences
            } else {
                consecutiveMatches = 0
            }

            // Bonus for match at start of string
            if (i === 0) {
                score += 20
            }

            // Bonus for match after space or special character (word boundary)
            if (i > 0 && (target[i - 1] === ' ' || target[i - 1] === '-' || target[i - 1] === '_')) {
                score += 15
            }

            if (firstMatchIndex === -1) firstMatchIndex = i
            lastMatchIndex = i
            searchIndex++
        }
    }

    // Return 0 if not all characters were matched
    if (searchIndex < search.length) {
        return 0
    }

    // Penalty for length difference (favor shorter targets)
    score -= Math.max(0, target.length - search.length) * 2
    // Penalty for gaps between first/last matched span
    const span = lastMatchIndex - firstMatchIndex + 1
    const gaps = Math.max(0, span - search.length)
    score -= gaps * 3

    return score
}

/**
 * Score and sort nodes by fuzzy search relevance
 */
export function searchNodes(nodes: NodeData[], searchValue: string): NodeData[] {
    // Return all nodes unsorted if search is empty
    if (!searchValue || searchValue.trim() === '') {
        return nodes
    }

    // Calculate fuzzy scores for each node
    const nodesWithScores = nodes.map((nd) => {
        const nameScore = fuzzyScore(searchValue, nd.name)
        const labelScore = fuzzyScore(searchValue, nd.label)
        const categoryScore = fuzzyScore(searchValue, nd.category || '') * 0.5 // Lower weight for category
        const descriptionScore = fuzzyScore(searchValue, nd.description || '') * 0.3 // Even lower for description
        const maxScore = Math.max(nameScore, labelScore, categoryScore, descriptionScore)

        return { node: nd, score: maxScore }
    })

    // Filter nodes with score > 0 and sort by score (highest first)
    return nodesWithScores
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((item) => item.node)
}

/**
 * Debounce function for search input
 */
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(func: T, wait: number): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    return function (...args: Parameters<T>) {
        if (timeoutId) {
            clearTimeout(timeoutId)
        }
        timeoutId = setTimeout(() => {
            func(...args)
        }, wait)
    }
}
