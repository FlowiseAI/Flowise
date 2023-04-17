import { createContext, useState } from 'react'
import PropTypes from 'prop-types'

const initialValue = {
    reactFlowInstance: null,
    setReactFlowInstance: () => {},
    deleteNode: () => {},
    deleteEdge: () => {}
}

export const flowContext = createContext(initialValue)

export const ReactFlowContext = ({ children }) => {
    const [reactFlowInstance, setReactFlowInstance] = useState(null)

    const deleteNode = (nodeid) => {
        deleteConnectedInput(nodeid, 'node')
        reactFlowInstance.setNodes(reactFlowInstance.getNodes().filter((n) => n.id !== nodeid))
        reactFlowInstance.setEdges(reactFlowInstance.getEdges().filter((ns) => ns.source !== nodeid && ns.target !== nodeid))
    }

    const deleteEdge = (edgeid) => {
        deleteConnectedInput(edgeid, 'edge')
        reactFlowInstance.setEdges(reactFlowInstance.getEdges().filter((edge) => edge.id !== edgeid))
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
                        if (inputAnchor && inputAnchor.list) {
                            const values = node.data.inputs[targetInput] || []
                            value = values.filter((item) => !item.includes(sourceNodeId))
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

    return (
        <flowContext.Provider
            value={{
                reactFlowInstance,
                setReactFlowInstance,
                deleteNode,
                deleteEdge
            }}
        >
            {children}
        </flowContext.Provider>
    )
}

ReactFlowContext.propTypes = {
    children: PropTypes.any
}
