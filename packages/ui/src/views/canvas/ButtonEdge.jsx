import { getBezierPath, EdgeText } from 'reactflow'
import PropTypes from 'prop-types'
import { useDispatch } from 'react-redux'
import { useContext, memo, useCallback } from 'react'
import { SET_DIRTY } from '@/store/actions'
import { flowContext } from '@/store/context/ReactFlowContext'
import { IconX } from '@tabler/icons-react'

import './index.css'

const foreignObjectSize = 40

const ButtonEdge = (props) => {
    const {
        id,
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
        style = {},
        data,
        markerEnd,
        isLoop,
        sourceHandleId,
        targetHandleId,
        dataFlowId
    } = props

    let pathSourceX = sourceX
    let pathSourceY = sourceY
    let pathTargetX = targetX
    let pathTargetY = targetY

    const getParentZoom = useCallback(() => {
        const parent = document.querySelector('.react-flow')
        if (!parent) return 1
        const flowPane = parent.querySelector('.react-flow__viewport')
        const parentTransform = getComputedStyle(flowPane).transform
        const matrix = parentTransform.match(/matrix.*\((.+)\)/)
        let transformMatrix = [1, 0, 0, 1, 0, 0] // 默认值
        if (matrix) {
            transformMatrix = matrix[1].split(', ').map(Number)
        }
        const zoom = Math.sqrt(transformMatrix[0] * transformMatrix[0] + transformMatrix[1] * transformMatrix[1])
        return zoom
    }, [dataFlowId])

    // 获取特定流程实例的容器
    const getFlowContainer = useCallback(() => {
        if (!dataFlowId) return document.querySelector('.react-flow')
        return document.querySelector(`[data-flow-id="${dataFlowId}"]`) || document.querySelector('.react-flow')
    }, [dataFlowId])

    // 获取句柄的实际位置
    const getHandlePosition = useCallback(
        (handle, container) => {
            if (!handle || !container) return null

            const handleBounds = handle.getBoundingClientRect()
            const containerBounds = container.getBoundingClientRect()
            const flowPane = container.querySelector('.react-flow__viewport')
            const flowTransform = flowPane ? getComputedStyle(flowPane).transform : 'none'
            let transformMatrix = [1, 0, 0, 1, 0, 0] // 默认值
            if (flowTransform && flowTransform !== 'none') {
                const matrix = flowTransform.match(/matrix.*\((.+)\)/)
                if (matrix) {
                    transformMatrix = matrix[1].split(', ').map(Number)
                }
            }

            // 提取缩放和平移值
            const zoom = Math.sqrt(transformMatrix[0] * transformMatrix[0] + transformMatrix[1] * transformMatrix[1])
            const translateX = transformMatrix[4]
            const translateY = transformMatrix[5]
            const parentZoom = getParentZoom()

            // 计算相对位置，考虑handle的中心点偏移
            const handleOffset = handleBounds.width / 2 // handle的一半宽度
            let x, y

            if (isLoop) {
                // 对于循环节点内部的连接
                x = ((handleBounds.left - containerBounds.left) / parentZoom - translateX) / zoom
                y = ((handleBounds.top - containerBounds.top) / parentZoom - translateY) / zoom

                // 根据handle的位置添加偏移
                if (handle.getAttribute('data-handlepos') === 'left') {
                    x += handleOffset
                } else if (handle.getAttribute('data-handlepos') === 'right') {
                    x -= handleOffset
                }
            } else {
                // 对于普通连接
                x = (handleBounds.left - containerBounds.left - translateX) / zoom
                y = (handleBounds.top - containerBounds.top - translateY) / zoom

                // 根据handle的位置添加偏移
                if (handle.getAttribute('data-handlepos') === 'left') {
                    x += handleOffset
                } else if (handle.getAttribute('data-handlepos') === 'right') {
                    x -= handleOffset
                }
            }
            y += handleBounds.height / 2
            return { x, y }
        },
        [dataFlowId, isLoop, getParentZoom]
    )

    // 计算边的位置
    const calculateEdgePosition = useCallback(() => {
        const flowContainer = getFlowContainer()
        if (!flowContainer) return null

        const sourceHandle = flowContainer.querySelector(`[data-handleid="${sourceHandleId}"]`)
        const targetHandle = flowContainer.querySelector(`[data-handleid="${targetHandleId}"]`)
        if (!sourceHandle || !targetHandle) return null

        const sourcePos = getHandlePosition(sourceHandle, flowContainer)
        const targetPos = getHandlePosition(targetHandle, flowContainer)

        if (!sourcePos || !targetPos) return null

        // 如果是嵌套流程，需要考虑父容器的位置
        if (dataFlowId) {
            const parentFlow = document.querySelector('.react-flow')
            if (parentFlow && flowContainer !== parentFlow) {
                return {
                    sourceX: sourcePos.x,
                    sourceY: sourcePos.y,
                    targetX: targetPos.x,
                    targetY: targetPos.y
                }
            }
        }

        return {
            sourceX: sourcePos.x,
            sourceY: sourcePos.y,
            targetX: targetPos.x,
            targetY: targetPos.y
        }
    }, [getFlowContainer, getHandlePosition, sourceHandleId, targetHandleId, dataFlowId])

    // 更新路径位置
    if (isLoop) {
        const positions = calculateEdgePosition()
        if (positions) {
            pathSourceX = positions.sourceX
            pathSourceY = positions.sourceY
            pathTargetX = positions.targetX
            pathTargetY = positions.targetY
        }
    }

    const [edgePath, edgeCenterX, edgeCenterY] = getBezierPath({
        sourceX: pathSourceX,
        sourceY: pathSourceY,
        sourcePosition,
        targetX: pathTargetX,
        targetY: pathTargetY,
        targetPosition,
        curvature: isLoop ? 0.3 : 0.2 // 循环节点使用更大的曲率
    })

    const { deleteEdge } = useContext(flowContext)
    const dispatch = useDispatch()

    const onEdgeClick = (evt, id) => {
        evt.stopPropagation()
        deleteEdge(id)
        dispatch({ type: SET_DIRTY })
        // 触发边更新事件，包含流程标识
        if (dataFlowId) {
            window.dispatchEvent(
                new CustomEvent('reactflow-edges-update', {
                    detail: {
                        flowId: dataFlowId,
                        edgeId: id,
                        isDelete: true
                    }
                })
            )
        }
    }

    return (
        <>
            <path id={id} style={style} className='react-flow__edge-path' d={edgePath} markerEnd={markerEnd} data-flow-id={dataFlowId} />
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
                data-flow-id={dataFlowId}
            >
                <div>
                    <button className='edgebutton' onClick={(event) => onEdgeClick(event, id)} data-flow-id={dataFlowId}>
                        <IconX stroke={2} size='12' />
                    </button>
                </div>
            </foreignObject>
        </>
    )
}

ButtonEdge.propTypes = {
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
    isLoop: PropTypes.bool,
    sourceHandleId: PropTypes.string,
    targetHandleId: PropTypes.string,
    dataFlowId: PropTypes.string
}

ButtonEdge.defaultProps = {
    isLoop: false
}

export default memo(ButtonEdge)
