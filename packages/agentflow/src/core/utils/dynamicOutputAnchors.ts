import type { OutputAnchor } from '../types'

/**
 * Build output anchors for a node based on a dynamic item count.
 * Generates one anchor per item (`${labelPrefix} 0`, `${labelPrefix} 1`, ...)
 * plus an optional Else anchor at the end.
 */
export function buildDynamicOutputAnchors(nodeId: string, count: number, labelPrefix: string, includeElse: boolean = true): OutputAnchor[] {
    const anchors: OutputAnchor[] = []

    for (let i = 0; i < count; i++) {
        anchors.push({
            id: `${nodeId}-output-${i}`,
            name: String(i),
            label: `${labelPrefix} ${i}`,
            type: labelPrefix
        })
    }

    if (includeElse) {
        anchors.push({
            id: `${nodeId}-output-${count}`,
            name: String(count),
            label: 'Else',
            type: labelPrefix
        })
    }

    return anchors
}
