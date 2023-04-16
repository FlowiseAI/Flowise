import { createContext, useState } from 'react'
import PropTypes from 'prop-types'
import { getUniqueNodeId } from 'utils/genericHelper'
import { cloneDeep } from 'lodash'

const initialValue = {
    reactFlowInstance: null,
    setReactFlowInstance: () => {},
    duplicateNode: () => {},
    deleteNode: () => {},
    deleteEdge: () => {}
}

export const flowContext = createContext(initialValue)

export const ReactFlowContext = ({ children }) => {
    const [reactFlowInstance, setReactFlowInstance] = useState(null)

    const deleteNode = (id) => {
        reactFlowInstance.setNodes(reactFlowInstance.getNodes().filter((n) => n.id !== id))
        reactFlowInstance.setEdges(reactFlowInstance.getEdges().filter((ns) => ns.source !== id && ns.target !== id))
    }

    const deleteEdge = (id) => {
        reactFlowInstance.setEdges(reactFlowInstance.getEdges().filter((edge) => edge.id !== id))
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
