import { useLayoutEffect, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import { ButtonBase } from '@mui/material'
import { styled } from '@mui/material/styles'

export const StyledButton = styled(ButtonBase)(({ theme }) => ({
    color: theme.palette.primary.main,
    padding: '3px 5px 3px 0',
    textAlign: 'left',
    '&:hover': {
        color: theme.palette.primary.dark
    }
}))

export default function ExpendableTextLine(props) {
    const { html, max } = props

    const contentRef = useRef()
    const [isExpandable, setIsExpandable] = useState(true)
    const [isExpanded, setIsExpanded] = useState(false)
    const [lineHeight, setLineHeight] = useState(0)

    useLayoutEffect(() => {
        if (contentRef.current) {
            const computedStyle = window.getComputedStyle(contentRef.current)
            const lineHeightProp = Number(computedStyle['line-height'].replace('px', ''))
            const scrollHeight = contentRef.current.scrollHeight
            setLineHeight(lineHeightProp)
            const contentHeight = contentRef.current.getBoundingClientRect().height
            setIsExpandable(scrollHeight > contentHeight)
        }
    }, [max])

    const toggle = (event) => {
        event.stopPropagation()
        setIsExpanded((prev) => !prev)
    }

    if (!isExpandable) {
        return html
    }

    const contentStyle = {
        display: '-webkit-box',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        WebkitBoxOrient: 'vertical'
    }

    if (!isExpanded) {
        contentStyle.WebkitLineClamp = max
    }

    const containerHeight = isExpanded ? 'auto' : max * lineHeight

    return (
        <>
            <div style={{ height: containerHeight }}>
                <div
                    dangerouslySetInnerHTML={{
                        __html: html
                    }}
                    ref={contentRef}
                    style={contentStyle}
                />
            </div>
            {isExpandable && (
                <StyledButton onClick={toggle} disableRipple={true}>
                    {isExpanded ? 'less' : 'more'}
                </StyledButton>
            )}
        </>
    )
}

ExpendableTextLine.propTypes = {
    max: PropTypes.number.isRequired,
    html: PropTypes.string
}
