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
 *
 * Matches the v2 flow data format where `label` and `name` are numeric
 * indices and `description` holds the human-readable text
 * (e.g. "Condition 0", "Else").
 */
export function buildDynamicOutputAnchors(nodeId: string, count: number, labelPrefix: string, includeElse: boolean = true): OutputAnchor[] {
    const anchors: OutputAnchor[] = []

    for (let i = 0; i < count; i++) {
        anchors.push({
            id: getOutputHandleId(nodeId, i),
            name: String(i),
            label: String(i),
            type: labelPrefix,
            description: `${labelPrefix} ${i}`
        })
    }

    if (includeElse) {
        anchors.push({
            id: getOutputHandleId(nodeId, count),
            name: String(count),
            label: String(count),
            type: labelPrefix,
            description: 'Else'
        })
    }

    return anchors
}
