import type { FlowEdge, FlowNode } from '@/core/types'

export const isNodeExplicitlyDisabled = (node: FlowNode): boolean => {
    const disabled = node?.data?.disabled
    return disabled === true || String(disabled) === 'true'
}

export const recalculateDisabledNodes = (nodes: FlowNode[], edges: FlowEdge[]): FlowNode[] => {
    const explicitlyDisabledNodeIds = new Set<string>(
        nodes
            .filter((node) => {
                const disabled = node.data?.disabled === true || String(node.data?.disabled) === 'true'
                const disabledBy = node.data?.disabledBy
                return disabled && !disabledBy
            })
            .map((node) => node.id)
    )

    const outgoingEdges = new Map<string, string[]>()
    for (const edge of edges) {
        const isToolEdge =
            edge.targetHandle &&
            (edge.targetHandle.includes('-input-tools-') ||
                edge.targetHandle.split('-input-')[1]?.startsWith('tools-') ||
                edge.targetHandle === 'tools' ||
                edge.targetHandle.startsWith('tools-'))
        const isModelEdge =
            edge.targetHandle &&
            (edge.targetHandle.includes('-input-model-') ||
                edge.targetHandle.split('-input-')[1]?.startsWith('model-') ||
                edge.targetHandle === 'model' ||
                edge.targetHandle.startsWith('model-'))
        if (isToolEdge || isModelEdge) continue

        const targets = outgoingEdges.get(edge.source) || []
        targets.push(edge.target)
        outgoingEdges.set(edge.source, targets)
    }

    const disabledByMap = new Map<string, string>()

    for (const rootId of explicitlyDisabledNodeIds) {
        const queue = [rootId]
        const visited = new Set<string>([rootId])

        while (queue.length > 0) {
            const currentId = queue.shift()!
            const targets = outgoingEdges.get(currentId) || []
            for (const targetId of targets) {
                if (visited.has(targetId)) continue
                visited.add(targetId)

                if (explicitlyDisabledNodeIds.has(targetId)) continue

                if (!disabledByMap.has(targetId)) {
                    disabledByMap.set(targetId, rootId)
                }
                queue.push(targetId)
            }
        }
    }

    return nodes.map((node) => {
        const isExplicit = explicitlyDisabledNodeIds.has(node.id)
        if (isExplicit) {
            const { disabledBy, ...nextData } = node.data
            return {
                ...node,
                data: {
                    ...nextData,
                    disabled: true
                }
            }
        }

        const disabledBy = disabledByMap.get(node.id)
        if (disabledBy) {
            return {
                ...node,
                data: {
                    ...node.data,
                    disabled: true,
                    disabledBy
                }
            }
        }

        const { disabled, disabledBy: _, ...nextData } = node.data
        return {
            ...node,
            data: {
                ...nextData,
                disabled: false
            }
        }
    })
}
