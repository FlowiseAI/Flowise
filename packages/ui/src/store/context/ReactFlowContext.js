import { createContext, useState } from 'react'
import { useDispatch } from 'react-redux'
import PropTypes from 'prop-types'
import { getUniqueNodeId } from 'utils/genericHelper'
import { cloneDeep } from 'lodash'
import { SET_DIRTY } from 'store/actions'

const initialValue = {
    reactFlowInstance: null,
    setReactFlowInstance: () => {},
    duplicateNode: () => {},
    deleteNode: () => {},
    deleteEdge: () => {}
}

export const flowContext = createContext(initialValue)

export const ReactFlowContext = ({ children }) => {
    const dispatch = useDispatch()
    const [reactFlowInstance, setReactFlowInstance] = useState(null)

    const deleteNode = (nodeid) => {
        deleteConnectedInput(nodeid, 'node')
        reactFlowInstance.setNodes(reactFlowInstance.getNodes().filter((n) => n.id !== nodeid))
        reactFlowInstance.setEdges(reactFlowInstance.getEdges().filter((ns) => ns.source !== nodeid && ns.target !== nodeid))
        dispatch({ type: SET_DIRTY })
    }

    const deleteEdge = (edgeid) => {
        deleteConnectedInput(edgeid, 'edge')
        reactFlowInstance.setEdges(reactFlowInstance.getEdges().filter((edge) => edge.id !== edgeid))
        dispatch({ type: SET_DIRTY })
    }

    const deleteConnectedInput = (id, type) => {
        const connectedEdges =
            type === 'node'
                ? reactFlowInstance.getEdges().filter((edge) => edge.source === id)
                : reactFlowInstance.getEdges().filter((edge) => edge.id === id)

        for (const edge of connectedEdges) {
            const targetNodeId = edge.target
            const sourceNodeId = edge.source
            const targetInput = edge.targetHandle.split('-')[2]

            reactFlowInstance.setNodes((nds) =>
                nds.map((node) => {
                    if (node.id === targetNodeId) {
                        let value
                        const inputAnchor = node.data.inputAnchors.find((ancr) => ancr.name === targetInput)
                        const inputParam = node.data.inputParams.find((param) => param.name === targetInput)

                        if (inputAnchor && inputAnchor.list) {
                            const values = node.data.inputs[targetInput] || []
                            value = values.filter((item) => !item.includes(sourceNodeId))
                        } else if (inputParam && inputParam.acceptVariable) {
                            value = node.data.inputs[targetInput].replace(`{{${sourceNodeId}.data.instance}}`, '') || ''
                        } else {
                            value = ''
                        }
                        node.data = {
                            ...node.data,
                            inputs: {
                                ...node.data.inputs,
                                [targetInput]: value
                            }
                        }
                    }
                    return node
                })
            )
        }
    }

    const duplicateNode = (id) => {
        const nodes = reactFlowInstance.getNodes()
        const originalNode = nodes.find((n) => n.id === id)
        if (originalNode) {
            const newNodeId = getUniqueNodeId(originalNode.data, nodes)
            const clonedNode = cloneDeep(originalNode)

            const duplicatedNode = {
                ...clonedNode,
                id: newNodeId,
                position: {
                    x: clonedNode.position.x + 400,
                    y: clonedNode.position.y
                },
                positionAbsolute: {
                    x: clonedNode.positionAbsolute.x + 400,
                    y: clonedNode.positionAbsolute.y
                },
                data: {
                    ...clonedNode.data,
                    id: newNodeId
                },
                selected: false
            }

            const dataKeys = ['inputParams', 'inputAnchors', 'outputAnchors']

            for (const key of dataKeys) {
                for (const item of duplicatedNode.data[key]) {
                    if (item.id) {
                        item.id = item.id.replace(id, newNodeId)
                    }
                }
            }

            reactFlowInstance.setNodes([...nodes, duplicatedNode])
            dispatch({ type: SET_DIRTY })
        }
    }

    return (
        <flowContext.Provider
            value={{
                reactFlowInstance,
                setReactFlowInstance,
                deleteNode,
                deleteEdge,
                duplicateNode
            }}
        >
            {children}
        </flowContext.Provider>
    )
}

ReactFlowContext.propTypes = {
    children: PropTypes.any
}
