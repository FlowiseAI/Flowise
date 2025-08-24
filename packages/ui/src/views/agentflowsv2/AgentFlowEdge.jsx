import { EdgeLabelRenderer, getBezierPath } from 'reactflow'
import { memo, useState, useContext } from 'react'
import PropTypes from 'prop-types'
import { useDispatch } from 'react-redux'
import { SET_DIRTY } from '@/store/actions'
import { flowContext } from '@/store/context/ReactFlowContext'
import { IconX } from '@tabler/icons-react'

function EdgeLabel({ transform, isHumanInput, label, color }) {
    return (
        <div
            style={{
                position: 'absolute',
                background: 'transparent',
                left: isHumanInput ? 10 : 0,
                paddingTop: 1,
                color: color,
                fontSize: '0.5rem',
                fontWeight: 700,
                transform,
                zIndex: 1000
            }}
            className='nodrag nopan'
        >
            {label}
        </div>
    )
}

EdgeLabel.propTypes = {
    transform: PropTypes.string,
    isHumanInput: PropTypes.bool,
    label: PropTypes.string,
    color: PropTypes.string
}

const foreignObjectSize = 40

const AgentFlowEdge = ({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, markerEnd, selected }) => {
    const [isHovered, setIsHovered] = useState(false)
    const { deleteEdge } = useContext(flowContext)
    const dispatch = useDispatch()

    const onEdgeClick = (evt, id) => {
        evt.stopPropagation()
        deleteEdge(id)
        dispatch({ type: SET_DIRTY })
    }

    const xEqual = sourceX === targetX
    const yEqual = sourceY === targetY

    const [edgePath, edgeCenterX, edgeCenterY] = getBezierPath({
        // we need this little hack in order to display the gradient for a straight line
        sourceX: xEqual ? sourceX + 0.0001 : sourceX,
        sourceY: yEqual ? sourceY + 0.0001 : sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition
    })

    const gradientId = `edge-gradient-${id}`
    return (
        <>
            <defs>
                <linearGradient id={gradientId}>
                    <stop offset='0%' stopColor={data?.sourceColor || '#ae53ba'} />
                    <stop offset='100%' stopColor={data?.targetColor || '#2a8af6'} />
                </linearGradient>
            </defs>
            <path
                id={`${id}-selector`}
                className='agent-flow-edge-selector'
                style={{
                    stroke: 'transparent',
                    strokeWidth: 15,
                    fill: 'none',
                    cursor: 'pointer'
                }}
                d={edgePath}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            />
            <path
                id={id}
                className='agent-flow-edge'
                style={{
                    strokeWidth: selected ? 3 : 2,
                    stroke: `url(#${gradientId})`,
                    filter: selected ? 'drop-shadow(0 0 3px rgba(0,0,0,0.3))' : 'none',
                    cursor: 'pointer',
                    opacity: selected ? 1 : 0.75,
                    fill: 'none'
                }}
                d={edgePath}
                markerEnd={markerEnd}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            />
            {data?.edgeLabel && (
                <EdgeLabelRenderer>
                    <EdgeLabel
                        isHumanInput={data?.isHumanInput}
                        color={data?.sourceColor || '#ae53ba'}
                        label={data.edgeLabel}
                        transform={`translate(-50%, 0%) translate(${sourceX}px,${sourceY}px)`}
                    />
                </EdgeLabelRenderer>
            )}
            {isHovered && (
                <foreignObject
                    width={foreignObjectSize}
                    height={foreignObjectSize}
                    x={edgeCenterX - foreignObjectSize / 2}
                    y={edgeCenterY - foreignObjectSize / 2}
                    className='edgebutton-foreignobject'
                    requiredExtensions='http://www.w3.org/1999/xhtml'
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                >
                    <div
                        style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            pointerEvents: 'all'
                        }}
                    >
                        <button
                            className='edgebutton'
                            onClick={(event) => onEdgeClick(event, id)}
                            style={{
                                width: '12px',
                                height: '12px',
                                background: `linear-gradient(to right, ${data?.sourceColor || '#ae53ba'}, ${
                                    data?.targetColor || '#2a8af6'
                                })`,
                                border: 'none',
                                borderRadius: '50%',
                                cursor: 'pointer',
                                fontSize: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                boxShadow: '0 0 4px rgba(0,0,0,0.3)',
                                transition: 'all 0.2s ease-in-out',
                                padding: '2px'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.transform = 'scale(1.2)'
                                e.currentTarget.style.boxShadow = '0 0 8px rgba(0,0,0,0.4)'
                            }}
                            onFocus={(e) => {
                                e.currentTarget.style.transform = 'scale(1.2)'
                                e.currentTarget.style.boxShadow = '0 0 8px rgba(0,0,0,0.4)'
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.transform = 'scale(1)'
                                e.currentTarget.style.boxShadow = '0 0 4px rgba(0,0,0,0.3)'
                            }}
                            onBlur={(e) => {
                                e.currentTarget.style.transform = 'scale(1)'
                                e.currentTarget.style.boxShadow = '0 0 4px rgba(0,0,0,0.3)'
                            }}
                        >
                            <IconX stroke={2} size='12' color='white' />
                        </button>
                    </div>
                </foreignObject>
            )}
        </>
    )
}

AgentFlowEdge.propTypes = {
    id: PropTypes.string,
    sourceX: PropTypes.number,
    sourceY: PropTypes.number,
    targetX: PropTypes.number,
    targetY: PropTypes.number,
    sourcePosition: PropTypes.any,
    targetPosition: PropTypes.any,
    style: PropTypes.object,
    data: PropTypes.object,
    markerEnd: PropTypes.any,
    selected: PropTypes.bool
}

export default memo(AgentFlowEdge)
