import { createContext, useState } from 'react'
import { useDispatch } from 'react-redux'
import PropTypes from 'prop-types'
import { getUniqueNodeId, showHideInputParams } from '@/utils/genericHelper'
import { cloneDeep, isEqual } from 'lodash'
import { SET_DIRTY } from '@/store/actions'

const initialValue = {
    reactFlowInstance: null,
    setReactFlowInstance: () => {},
    duplicateNode: () => {},
    deleteNode: () => {},
    deleteEdge: () => {},
    onNodeDataChange: () => {}
}

export const flowContext = createContext(initialValue)

export const ReactFlowContext = ({ children }) => {
    const dispatch = useDispatch()
    const [reactFlowInstance, setReactFlowInstance] = useState(null)

    const onAgentflowNodeStatusUpdate = ({ nodeId, status, error }) => {
        reactFlowInstance.setNodes((nds) =>
            nds.map((node) => {
                if (node.id === nodeId) {
                    node.data = {
                        ...node.data,
                        status,
                        error
                    }
                }
                return node
            })
        )
    }

    const clearAgentflowNodeStatus = () => {
        reactFlowInstance.setNodes((nds) =>
            nds.map((node) => {
                node.data = {
                    ...node.data,
                    status: undefined,
                    error: undefined
                }
                return node
            })
        )
    }

    const onNodeDataChange = ({ nodeId, inputParam, newValue }) => {
        const updatedNodes = reactFlowInstance.getNodes().map((node) => {
            if (node.id === nodeId) {
                const updatedInputs = { ...node.data.inputs }

                updatedInputs[inputParam.name] = newValue

                const updatedInputParams = showHideInputParams({
                    ...node.data,
                    inputs: updatedInputs
                })

                // Remove inputs with display set to false
                Object.keys(updatedInputs).forEach((key) => {
                    const input = updatedInputParams.find((param) => param.name === key)
                    if (input && input.display === false) {
                        delete updatedInputs[key]
                    }
                })

                return {
                    ...node,
                    data: {
                        ...node.data,
                        inputParams: updatedInputParams,
                        inputs: updatedInputs
                    }
                }
            }
            return node
        })

        // Check if any node's inputParams have changed before updating
        const hasChanges = updatedNodes.some(
            (node, index) => !isEqual(node.data.inputParams, reactFlowInstance.getNodes()[index].data.inputParams)
        )

        if (hasChanges) {
            reactFlowInstance.setNodes(updatedNodes)
        }
    }

    const deleteNode = (nodeid) => {
        deleteConnectedInput(nodeid, 'node')

        // Gather all nodes to be deleted (parent and all descendants)
        const nodesToDelete = new Set()

        // Helper function to collect all descendant nodes recursively
        const collectDescendants = (parentId) => {
            const childNodes = reactFlowInstance.getNodes().filter((node) => node.parentNode === parentId)

            childNodes.forEach((childNode) => {
                nodesToDelete.add(childNode.id)
                collectDescendants(childNode.id)
            })
        }

        // Collect all descendants first
        collectDescendants(nodeid)

        // Add the parent node itself last
        nodesToDelete.add(nodeid)

        // Clean up inputs for all nodes to be deleted
        nodesToDelete.forEach((id) => {
            if (id !== nodeid) {
                // Skip parent node as it's already processed at the beginning
                deleteConnectedInput(id, 'node')
            }
        })

        // Filter out all nodes and edges in a single operation
        reactFlowInstance.setNodes((nodes) => nodes.filter((node) => !nodesToDelete.has(node.id)))

        // Remove all edges connected to any of the deleted nodes
        reactFlowInstance.setEdges((edges) => edges.filter((edge) => !nodesToDelete.has(edge.source) && !nodesToDelete.has(edge.target)))

        dispatch({ type: SET_DIRTY })
    }

    const deleteEdge = (edgeid) => {
        deleteConnectedInput(edgeid, 'edge')
        const newEdges = reactFlowInstance.getEdges().filter((edge) => edge.id !== edgeid)
        reactFlowInstance.setEdges(newEdges)
        dispatch({ type: SET_DIRTY })
        // 创建自定义事件并传递所有边的数据
        const event = new CustomEvent('reactflow-edges-update', {
            detail: {
                edgeid,
                isDelete: true
            }
        })
        window.dispatchEvent(event)
    }

    const deleteConnectedInput = (id, type) => {
        const connectedEdges =
            type === 'node'
                ? reactFlowInstance.getEdges().filter((edge) => edge.source === id)
                : reactFlowInstance.getEdges().filter((edge) => edge.id === id)

        for (const edge of connectedEdges) {
            const targetNodeId = edge.target
            const targetInput = edge.targetHandle.split('-')[2]

            reactFlowInstance.setNodes((nds) =>
                nds.map((node) => {
                    if (node.id === targetNodeId) {
                        let value
                        const inputAnchor = node.data.inputAnchors.find((ancr) => ancr.name === targetInput)

                        if (inputAnchor?.list) {
                            value = node.data.inputs[targetInput] || []
                            value = value.filter((item) => {
                                if (typeof item === 'string') {
                                    return !item.startsWith('{{') || !item.endsWith('}}')
                                }
                                return true
                            })
                        } else {
                            value = ''
                        }

                        return {
                            ...node,
                            data: {
                                ...node.data,
                                inputs: {
                                    ...node.data.inputs,
                                    [targetInput]: value
                                }
                            }
                        }
                    }
                    return node
                })
            )
        }
    }

    // 添加一个递归查找节点的辅助函数
    const findNodeRecursively = (nodes, nodeId) => {
        // 先在顶层节点中查找
        let node = nodes.find((n) => n.id === nodeId)
        if (node) return node

        // 如果顶层没找到，递归查找每个节点的 innerNodes
        for (const n of nodes) {
            if (n.data && Array.isArray(n.data.innerNodes)) {
                node = findNodeRecursively(n.data.innerNodes, nodeId)
                if (node) return node
            }
        }

        return null
    }

    const duplicateNode = (data, distance = 50) => {
        const { id } = data
        const nodes = reactFlowInstance.getNodes()
        // 使用递归函数查找节点
        const originalNode = findNodeRecursively(nodes, id)

        if (!originalNode) return

        // 检查是否是循环组件内的节点
        if (data.isInLoop && data.parentId) {
            // 获取父循环节点
            const parentLoopNode = nodes.find((n) => n.id === data.parentId)
            if (!parentLoopNode) return

            // 创建新的复制节点ID，需要考虑循环节点内的所有节点
            const newNodeId = getUniqueNodeId(originalNode.data, [...nodes, ...(parentLoopNode.data.innerNodes || [])])

            const clonedNode = cloneDeep(originalNode)
            if (!clonedNode.positionAbsolute) {
                clonedNode.positionAbsolute = clonedNode.position
            }
            const duplicatedNode = {
                ...clonedNode,
                id: newNodeId,
                position: {
                    x: clonedNode.position.x + clonedNode.width + distance,
                    y: clonedNode.position.y
                },
                positionAbsolute: {
                    x: clonedNode.positionAbsolute.x + clonedNode.width + distance,
                    y: clonedNode.positionAbsolute.y
                },
                data: {
                    ...clonedNode.data,
                    id: newNodeId,
                    label: clonedNode.data.label + ` (${newNodeId.split('_').pop()})`,
                    isInLoop: true,
                    parentId: data.parentId,
                    onNodesChange: clonedNode.data.onNodesChange
                },
                selected: false
            }

            // 更新节点的输入输出锚点ID
            const inputKeys = ['inputParams', 'inputAnchors']
            for (const key of inputKeys) {
                for (const item of duplicatedNode.data[key]) {
                    if (item.id) {
                        item.id = item.id.replace(id, newNodeId)
                    }
                }
            }

            const outputKeys = ['outputAnchors']
            for (const key of outputKeys) {
                for (const item of duplicatedNode.data[key]) {
                    if (item.id) {
                        item.id = item.id.replace(id, newNodeId)
                    }
                    if (item.options) {
                        for (const output of item.options) {
                            output.id = output.id.replace(id, newNodeId)
                        }
                    }
                }
            }

            // 清除已连接的输入
            for (const inputName in duplicatedNode.data.inputs) {
                if (
                    typeof duplicatedNode.data.inputs[inputName] === 'string' &&
                    duplicatedNode.data.inputs[inputName].startsWith('{{') &&
                    duplicatedNode.data.inputs[inputName].endsWith('}}')
                ) {
                    duplicatedNode.data.inputs[inputName] = ''
                } else if (Array.isArray(duplicatedNode.data.inputs[inputName])) {
                    duplicatedNode.data.inputs[inputName] = duplicatedNode.data.inputs[inputName].filter(
                        (item) => !(typeof item === 'string' && item.startsWith('{{') && item.endsWith('}}'))
                    )
                }
            }

            // 更新父循环节点的 innerNodes
            const updatedParentNode = {
                ...parentLoopNode,
                data: {
                    ...parentLoopNode.data,
                    innerNodes: [...(parentLoopNode.data.innerNodes || []), duplicatedNode]
                }
            }

            // 更新整个流程图的节点
            reactFlowInstance.setNodes(nodes.map((node) => (node.id === data.parentId ? updatedParentNode : node)))
            // 触发一个自定义事件来通知节点更新
            window.dispatchEvent(new CustomEvent('reactflow-nodes-update'))
        } else {
            // 原有的普通节点复制逻辑
            const newNodeId = getUniqueNodeId(originalNode.data, nodes)
            const clonedNode = cloneDeep(originalNode)

            const duplicatedNode = {
                ...clonedNode,
                id: newNodeId,
                position: {
                    x: clonedNode.position.x + clonedNode.width + distance,
                    y: clonedNode.position.y
                },
                positionAbsolute: {
                    x: clonedNode.positionAbsolute.x + clonedNode.width + distance,
                    y: clonedNode.positionAbsolute.y
                },
                data: {
                    ...clonedNode.data,
                    id: newNodeId,
                    label: clonedNode.data.label + ` (${newNodeId.split('_').pop()})`
                },
                selected: false
            }

            // 更新节点的输入输出锚点ID
            const inputKeys = ['inputParams', 'inputAnchors']
            for (const key of inputKeys) {
                for (const item of duplicatedNode.data[key]) {
                    if (item.id) {
                        item.id = item.id.replace(id, newNodeId)
                    }
                }
            }

            const outputKeys = ['outputAnchors']
            for (const key of outputKeys) {
                for (const item of duplicatedNode.data[key]) {
                    if (item.id) {
                        item.id = item.id.replace(id, newNodeId)
                    }
                    if (item.options) {
                        for (const output of item.options) {
                            output.id = output.id.replace(id, newNodeId)
                        }
                    }
                }
            }

            // 清除已连接的输入
            for (const inputName in duplicatedNode.data.inputs) {
                if (
                    typeof duplicatedNode.data.inputs[inputName] === 'string' &&
                    duplicatedNode.data.inputs[inputName].startsWith('{{') &&
                    duplicatedNode.data.inputs[inputName].endsWith('}}')
                ) {
                    duplicatedNode.data.inputs[inputName] = ''
                } else if (Array.isArray(duplicatedNode.data.inputs[inputName])) {
                    duplicatedNode.data.inputs[inputName] = duplicatedNode.data.inputs[inputName].filter(
                        (item) => !(typeof item === 'string' && item.startsWith('{{') && item.endsWith('}}'))
                    )
                }
            }

            reactFlowInstance.setNodes([...nodes, duplicatedNode])
        }

        dispatch({ type: SET_DIRTY })
    }

    return (
        <flowContext.Provider
            value={{
                reactFlowInstance,
                setReactFlowInstance,
                deleteNode,
                deleteEdge,
                duplicateNode,
                onAgentflowNodeStatusUpdate,
                clearAgentflowNodeStatus,
                onNodeDataChange
            }}
        >
            {children}
        </flowContext.Provider>
    )
}

ReactFlowContext.propTypes = {
    children: PropTypes.any
}
