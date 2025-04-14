// @ts-ignore-file
import React, { useState, useRef } from 'react'
import { DraggableCore } from 'react-draggable'
import { debounce } from '@utils/debounce'

import Box from '@mui/material/Box'
import { styled, Theme, CSSObject, SxProps } from '@mui/material'

type ResizePanelProps = {
    direction: 'n' | 's' | 'e' | 'w'
    containerClass?: string
    handleClass?: string
    borderClass?: string
    sx?: SxProps<Theme> & CSSObject
}

const StyledResizePanel = styled('div')<ResizePanelProps>(({ sx, theme }) => ({
    display: 'flex',
    alignItems: 'stretch',
    ...(sx?.[theme.breakpoints.up('md')] as CSSObject)
}))

const ResizeContent = styled(Box)<ResizePanelProps>(({ direction }) => ({
    flexGrow: 1,
    alignSelf: 'stretch',
    display: 'flex',
    flexDirection: direction === 'n' || direction === 's' ? 'column' : 'row'
}))

const ResizeHandle = styled(Box)<ResizePanelProps>(() => ({
    cursor: 'ew-resize',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '12px',
    height: '50px',
    '& > span': {
        display: 'inline-block',
        overflow: 'hidden',
        fontSize: '12px',
        fontWeight: 'bold',
        fontFamily: 'sans-serif',
        letterSpacing: '1px',
        color: '#b3b3b3',
        textShadow: '1px 0 1px rgb(90, 90, 90)'
    }
}))

const ResizeBar = styled(Box)<ResizePanelProps>(({ direction }) => ({
    cursor: direction === 'n' || direction === 's' ? 'ns-resize' : 'ew-resize',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: direction === 'n' || direction === 's' ? '100%' : '20px',
    height: direction === 'n' || direction === 's' ? '20px' : '100%',
    marginLeft: direction === 'e' ? '-10px' : 0,
    marginRight: direction === 'w' ? '-10px' : 0,
    marginTop: direction === 's' ? '-10px' : 0,
    marginBottom: direction === 'n' ? '-10px' : 0
}))

const ResizePanel = ({ direction, containerClass, handleClass, borderClass, sx, children }: React.PropsWithChildren<ResizePanelProps>) => {
    const [size, setSize] = useState<number | null>(null)
    const contentRef = useRef<HTMLDivElement>(null)
    const wrapperRef = useRef<HTMLDivElement>(null)

    const validateSize = debounce(() => {
        const { current: content } = contentRef
        const { current: wrapper } = wrapperRef

        if (!content || !wrapper) return

        const actualContent = content.children[0]
        const containerParent: HTMLElement | null = wrapper.parentElement

        if (!containerParent) return

        const minSize = direction === 'n' || direction === 's' ? actualContent.scrollHeight : actualContent.scrollWidth
        const margins =
            direction === 'n' || direction === 's'
                ? parseFloat(getComputedStyle(actualContent).marginTop + getComputedStyle(actualContent).marginBottom)
                : parseFloat(getComputedStyle(actualContent).marginLeft + getComputedStyle(actualContent).marginRight)
        const newSize = minSize + margins

        if (size !== newSize) {
            setSize(newSize)
        } else {
            const overflow =
                direction === 'n' || direction === 's'
                    ? containerParent.scrollHeight - containerParent.clientHeight
                    : containerParent.scrollWidth - containerParent.clientWidth

            if (overflow) {
                const newSize =
                    direction === 'n' || direction === 's' ? actualContent.clientHeight - overflow : actualContent.clientWidth - overflow
                setSize(newSize)
            }
        }
    }, 100)

    const handleDrag = (e: any, ui: any) => {
        const factor = direction === 'e' || direction === 's' ? -1 : 1 // modify the size based on the drag delta
        let delta = direction === 'n' || direction === 's' ? ui.deltaY : ui.deltaX
        setSize((s) => Math.max(10, (s ?? 0) - delta * factor))
    }

    const handleDragEnd = () => {
        validateSize()
    }

    const isHorizontal = direction === 'w' || direction === 'e'

    const containerProps = {
        className: containerClass,
        style: {
            flexGrow: size === null ? 1 : 0,
            [isHorizontal ? 'width' : 'height']: 'auto',
            ...(sx ?? {})
        },
        ref: wrapperRef
    }

    const handleProps = {
        className: handleClass,
        sx: { zIndex: 10 },
        direction
    }

    const resizeBarProps = {
        className: borderClass,
        sx: { zIndex: 10 },
        direction
    }

    const contentProps = {
        ref: contentRef,
        sx: { [isHorizontal ? 'width' : 'height']: size },
        direction
    }

    const handle = (
        <DraggableCore onDrag={handleDrag} onStop={handleDragEnd}>
            <ResizeBar {...resizeBarProps}>
                <ResizeHandle {...handleProps}>
                    <span>{direction === 'w' || direction === 'e' ? '|||' : '='}</span>
                </ResizeHandle>
            </ResizeBar>
        </DraggableCore>
    )

    // Insert the handle at the beginning of the content if our directio is west or north
    const content = [
        handle,
        <ResizeContent key={'resize-content'} {...contentProps}>
            {children}
        </ResizeContent>
    ]
    if (direction === 'e' || direction === 's') {
        content.reverse()
    }

    // @ts-expect-error
    return <StyledResizePanel {...containerProps}>{content}</StyledResizePanel>
}

export default ResizePanel
