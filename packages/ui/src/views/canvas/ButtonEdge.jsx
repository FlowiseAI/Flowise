import { getBezierPath, EdgeText } from 'reactflow'
import PropTypes from 'prop-types'
import { useDispatch } from 'react-redux'
import { useContext, memo } from 'react'
import { SET_DIRTY } from '@/store/actions'
import { flowContext } from '@/store/context/ReactFlowContext'
import { IconX } from '@tabler/icons-react'
import { isNodeExplicitlyDisabled } from '@/utils/disabledNodes'

import './index.css'

const foreignObjectSize = 40

const ButtonEdge = ({
    id,
    source,
    target,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    data,
    markerEnd
}) => {
    const [edgePath, edgeCenterX, edgeCenterY] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition
    })

    const { deleteEdge, reactFlowInstance } = useContext(flowContext)
    const nodes = reactFlowInstance?.getNodes?.() || []
    const isDisabledEdge = nodes.some((node) => (node.id === source || node.id === target) && isNodeExplicitlyDisabled(node))

    const dispatch = useDispatch()

    const onEdgeClick = (evt, id) => {
        evt.stopPropagation()
        deleteEdge(id)
        dispatch({ type: SET_DIRTY })
    }

    return (
        <>
            <path
                id={id}
                style={{
                    ...style,
                    opacity: isDisabledEdge ? 0.35 : style.opacity,
                    strokeDasharray: isDisabledEdge ? '6 4' : style.strokeDasharray
                }}
                className='react-flow__edge-path'
                d={edgePath}
                markerEnd={markerEnd}
            />
            {data && data.label && (
                <EdgeText
                    x={sourceX + 10}
                    y={sourceY + 10}
                    label={data.label}
                    labelStyle={{ fill: 'black' }}
                    labelBgStyle={{ fill: 'transparent' }}
                    labelBgPadding={[2, 4]}
                    labelBgBorderRadius={2}
                />
            )}
            <foreignObject
                width={foreignObjectSize}
                height={foreignObjectSize}
                x={edgeCenterX - foreignObjectSize / 2}
                y={edgeCenterY - foreignObjectSize / 2}
                className='edgebutton-foreignobject'
                requiredExtensions='http://www.w3.org/1999/xhtml'
            >
                <div>
                    <button className='edgebutton' onClick={(event) => onEdgeClick(event, id)}>
                        <IconX stroke={2} size='12' />
                    </button>
                </div>
            </foreignObject>
        </>
    )
}

ButtonEdge.propTypes = {
    id: PropTypes.string,
    source: PropTypes.string,
    target: PropTypes.string,
    sourceX: PropTypes.number,
    sourceY: PropTypes.number,
    targetX: PropTypes.number,
    targetY: PropTypes.number,
    sourcePosition: PropTypes.any,
    targetPosition: PropTypes.any,
    style: PropTypes.object,
    data: PropTypes.object,
    markerEnd: PropTypes.any
}

export default memo(ButtonEdge)
