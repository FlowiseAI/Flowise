import { useEffect, useState } from 'react'

import type { NodeData } from '@/core/types'
import { useApiContext, useConfigContext } from '@/infrastructure/store'

/**
 * Hook for loading and filtering available agentflow nodes from the API
 */
export function useFlowNodes() {
    const { nodesApi } = useApiContext()
    const { components: allowedComponents } = useConfigContext()
    const [availableNodes, setAvailableNodes] = useState<NodeData[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    useEffect(() => {
        const loadNodes = async () => {
            setIsLoading(true)
            setError(null)
            let agentflowNodes: NodeData[] = []

            try {
                const allNodes = await nodesApi.getAllNodes()
                // Filter to only agentflow nodes
                agentflowNodes = allNodes.filter((node) => node.category === 'Agent Flows')
            } catch (err) {
                console.warn('[Agentflow] Failed to load nodes from API:', err)
                setError(err instanceof Error ? err : new Error('Failed to load nodes'))
            }

            // Apply component filter
            if (allowedComponents && allowedComponents.length > 0) {
                const allowed = new Set(['startAgentflow', ...allowedComponents])
                setAvailableNodes(agentflowNodes.filter((n) => allowed.has(n.name)))
            } else {
                setAvailableNodes(agentflowNodes)
            }
            setIsLoading(false)
        }

        loadNodes()
    }, [nodesApi, allowedComponents])

    return { availableNodes, isLoading, error }
}
