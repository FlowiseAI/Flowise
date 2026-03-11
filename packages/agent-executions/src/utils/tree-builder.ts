import { FLOWISE_CREDENTIAL_ID } from '../constants'
import type { ExecutionNode, ExecutionTreeItem } from '../types'

interface InternalTreeNode extends ExecutionNode {
    uniqueNodeId: string
    children: InternalTreeNode[]
    executionIndex: number
    virtualParentId?: string
}

export const buildTreeData = (nodes: ExecutionNode[]): ExecutionTreeItem[] => {
    // Remove FLOWISE_CREDENTIAL_ID from all node data
    nodes.forEach((node) => {
        const removeFlowiseCredentialId = (data: Record<string, unknown>) => {
            for (const key in data) {
                if (key === FLOWISE_CREDENTIAL_ID) {
                    delete data[key]
                }
                if (typeof data[key] === 'object' && data[key] !== null) {
                    removeFlowiseCredentialId(data[key] as Record<string, unknown>)
                }
            }
        }
        removeFlowiseCredentialId(node.data as Record<string, unknown>)
    })

    // Create a map for quick node lookup using execution index for uniqueness
    const nodeMap = new Map<string, InternalTreeNode>()
    nodes.forEach((node, index) => {
        const uniqueNodeId = `${node.nodeId}_${index}`
        nodeMap.set(uniqueNodeId, { ...node, uniqueNodeId, children: [], executionIndex: index })
    })

    // Identify iteration nodes and group by parent + iteration index
    const iterationGroups = new Map<string, Map<number, string[]>>()

    nodes.forEach((node, index) => {
        if (node.data?.parentNodeId && node.data?.iterationIndex !== undefined) {
            const parentId = node.data.parentNodeId as string
            const iterationIndex = node.data.iterationIndex as number

            if (!iterationGroups.has(parentId)) {
                iterationGroups.set(parentId, new Map())
            }

            const iterationMap = iterationGroups.get(parentId)!
            if (!iterationMap.has(iterationIndex)) {
                iterationMap.set(iterationIndex, [])
            }

            iterationMap.get(iterationIndex)!.push(`${node.nodeId}_${index}`)
        }
    })

    // Create virtual iteration container nodes
    iterationGroups.forEach((iterationMap, parentId) => {
        iterationMap.forEach((nodeIds, iterationIndex) => {
            let parentNode: ExecutionNode | null = null
            for (let i = 0; i < nodes.length; i++) {
                if (nodes[i].nodeId === parentId) {
                    parentNode = nodes[i]
                    break
                }
            }
            if (!parentNode) return

            const firstChildId = nodeIds[0]
            const firstChild = nodeMap.get(firstChildId)
            const iterationContext = (firstChild?.data?.iterationContext as { index: number }) || { index: iterationIndex }

            const iterationNodeId = `${parentId}_${iterationIndex}`
            const iterationLabel = `Iteration #${iterationIndex}`

            const childNodes = nodeIds.map((id) => nodeMap.get(id)!)
            const iterationStatus = childNodes.some((n) => n.status === 'ERROR')
                ? 'ERROR'
                : childNodes.some((n) => n.status === 'INPROGRESS')
                ? 'INPROGRESS'
                : childNodes.every((n) => n.status === 'FINISHED')
                ? 'FINISHED'
                : 'FINISHED'

            const virtualNode: InternalTreeNode = {
                nodeId: iterationNodeId,
                nodeLabel: iterationLabel,
                data: {
                    name: 'iterationAgentflow',
                    iterationIndex,
                    iterationContext,
                    isVirtualNode: true,
                    parentIterationId: parentId
                },
                previousNodeIds: [],
                status: iterationStatus as ExecutionNode['status'],
                uniqueNodeId: iterationNodeId,
                children: [],
                executionIndex: -1
            }

            nodeMap.set(iterationNodeId, virtualNode)

            nodeIds.forEach((childId) => {
                const childNode = nodeMap.get(childId)
                if (childNode) {
                    childNode.virtualParentId = iterationNodeId
                }
            })
        })
    })

    // First pass: Build main tree structure (excluding iteration children)
    const rootNodes: InternalTreeNode[] = []
    nodes.forEach((node, index) => {
        const uniqueNodeId = `${node.nodeId}_${index}`
        const treeNode = nodeMap.get(uniqueNodeId)!

        if (node.data?.parentNodeId && node.data?.iterationIndex !== undefined) {
            return
        }

        if (node.previousNodeIds.length === 0) {
            rootNodes.push(treeNode)
        } else {
            let mostRecentParentIndex = -1
            let mostRecentParentId: string | null = null

            node.previousNodeIds.forEach((parentId) => {
                for (let i = 0; i < index; i++) {
                    if (nodes[i].nodeId === parentId && i > mostRecentParentIndex) {
                        mostRecentParentIndex = i
                        mostRecentParentId = parentId
                    }
                }
            })

            if (mostRecentParentIndex !== -1 && mostRecentParentId) {
                const parentUniqueId = `${mostRecentParentId}_${mostRecentParentIndex}`
                const parentNode = nodeMap.get(parentUniqueId)
                if (parentNode) {
                    parentNode.children.push(treeNode)
                }
            }
        }
    })

    // Second pass: Add virtual iteration nodes to their parents
    iterationGroups.forEach((iterationMap, parentId) => {
        const parentInstances: string[] = []
        nodes.forEach((node, index) => {
            if (node.nodeId === parentId) {
                parentInstances.push(`${node.nodeId}_${index}`)
            }
        })

        let latestParent: InternalTreeNode | null = null
        for (let i = parentInstances.length - 1; i >= 0; i--) {
            const pId = parentInstances[i]
            const parent = nodeMap.get(pId)
            if (parent) {
                latestParent = parent
                break
            }
        }

        if (!latestParent) return

        iterationMap.forEach((_nodeIds, iterationIndex) => {
            const iterationNodeId = `${parentId}_${iterationIndex}`
            const virtualNode = nodeMap.get(iterationNodeId)
            if (virtualNode) {
                latestParent!.children.push(virtualNode)
            }
        })
    })

    // Third pass: Build structure inside virtual iteration nodes
    nodeMap.forEach((node) => {
        if (node.virtualParentId) {
            const virtualParent = nodeMap.get(node.virtualParentId)
            if (virtualParent) {
                if (node.previousNodeIds.length === 0) {
                    virtualParent.children.push(node)
                } else {
                    let parentFound = false
                    for (const prevNodeId of node.previousNodeIds) {
                        nodeMap.forEach((potentialParent) => {
                            if (
                                potentialParent.nodeId === prevNodeId &&
                                potentialParent.data?.iterationIndex === node.data?.iterationIndex &&
                                potentialParent.data?.parentNodeId === node.data?.parentNodeId &&
                                !parentFound
                            ) {
                                potentialParent.children.push(node)
                                parentFound = true
                            }
                        })
                    }
                    if (!parentFound) {
                        virtualParent.children.push(node)
                    }
                }
            }
        }
    })

    // Final pass: Sort children (iteration nodes first, then by execution order)
    const sortChildrenNodes = (node: InternalTreeNode) => {
        if (node.children && node.children.length > 0) {
            node.children.sort((a, b) => {
                const aIsIteration = a.data?.name === 'iterationAgentflow' || a.data?.isVirtualNode
                const bIsIteration = b.data?.name === 'iterationAgentflow' || b.data?.isVirtualNode

                if (aIsIteration === bIsIteration) {
                    return a.executionIndex - b.executionIndex
                }
                return aIsIteration ? -1 : 1
            })
            node.children.forEach(sortChildrenNodes)
        }
    }

    rootNodes.forEach(sortChildrenNodes)

    // Transform to output format
    const transformNode = (node: InternalTreeNode): ExecutionTreeItem => ({
        id: node.uniqueNodeId,
        label: node.nodeLabel,
        name: node.data?.name as string | undefined,
        status: node.status,
        data: node.data,
        children: node.children.map(transformNode)
    })

    return rootNodes.map(transformNode)
}

export const getAllNodeIds = (nodes: ExecutionTreeItem[]): string[] => {
    let ids: string[] = []
    nodes.forEach((node) => {
        ids.push(node.id)
        if (node.children && node.children.length > 0) {
            ids = [...ids, ...getAllNodeIds(node.children)]
        }
    })
    return ids
}

export const findNode = (nodes: ExecutionTreeItem[], id: string): ExecutionTreeItem | null => {
    for (const node of nodes) {
        if (node.id === id) return node
        if (node.children) {
            const found = findNode(node.children, id)
            if (found) return found
        }
    }
    return null
}

export const findFirstStoppedNode = (nodes: ExecutionTreeItem[]): ExecutionTreeItem | null => {
    for (const node of nodes) {
        if (node.status === 'STOPPED') return node
        if (node.children) {
            const found = findFirstStoppedNode(node.children)
            if (found) return found
        }
    }
    return null
}
