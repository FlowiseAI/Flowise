import type { OutputAnchor } from '../types'

/** Build a deterministic output handle ID for a given node and index. */
export function getOutputHandleId(nodeId: string, index: number): string {
    return `${nodeId}-output-${index}`
}

/** Parse the numeric index from an output handle ID. Returns NaN if the format doesn't match. */
export function parseOutputHandleIndex(nodeId: string, handleId: string): number {
    const prefix = `${nodeId}-output-`
    if (!handleId.startsWith(prefix)) return NaN
    return parseInt(handleId.slice(prefix.length), 10)
}

/**
 * Build output anchors for a node based on a dynamic item count.
 * Generates one anchor per item (`${labelPrefix} 0`, `${labelPrefix} 1`, ...)
 * plus an optional Else anchor at the end.
 */
export function buildDynamicOutputAnchors(nodeId: string, count: number, labelPrefix: string, includeElse: boolean = true): OutputAnchor[] {
    const anchors: OutputAnchor[] = []

    for (let i = 0; i < count; i++) {
        anchors.push({
            id: getOutputHandleId(nodeId, i),
            name: String(i),
            label: `${labelPrefix} ${i}`,
            type: labelPrefix
        })
    }

    if (includeElse) {
        anchors.push({
            id: getOutputHandleId(nodeId, count),
            name: String(count),
            label: 'Else',
            type: labelPrefix
        })
    }

    return anchors
}
