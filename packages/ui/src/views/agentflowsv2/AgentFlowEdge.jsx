import { EdgeLabelRenderer, getBezierPath } from 'reactflow'
import { memo } from 'react'
import PropTypes from 'prop-types'

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

const AgentFlowEdge = ({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, markerEnd, selected }) => {
    const xEqual = sourceX === targetX
    const yEqual = sourceY === targetY

    const [edgePath] = getBezierPath({
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
