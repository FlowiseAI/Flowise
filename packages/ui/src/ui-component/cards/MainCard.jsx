import PropTypes from 'prop-types'
import { forwardRef, useRef, useImperativeHandle } from 'react'

// material-ui
import { Card, CardContent, CardHeader, Divider, Typography } from '@mui/material'

// custom hook
import { useRailGuardPadding } from '../../hooks/useRailGuardPadding'

// constant
const headerSX = {
    '& .MuiCardHeader-action': { mr: 0 }
}

// ==============================|| CUSTOM MAIN CARD ||============================== //

const MainCard = forwardRef(function MainCard(
    {
        boxShadow,
        children,
        content = true,
        contentClass = '',
        contentSX = {
            px: 2,
            py: 0
        },
        darkTitle,
        maxWidth = 'full',
        secondary,
        shadow,
        sx = {},
        title,
        ...others
    },
    ref
) {
    // local ref for measuring
    const wrapperRef = useRef(null)

    // hook to calculate left padding
    const leftPad = useRailGuardPadding(wrapperRef)

    // expose wrapperRef to parent if they pass a ref
    useImperativeHandle(ref, () => wrapperRef.current)

    const otherProps = { ...others, border: others.border === false ? undefined : others.border }

    return (
        <Card
            ref={wrapperRef}
            {...otherProps}
            sx={{
                background: 'transparent',
                ':hover': {
                    boxShadow: boxShadow ? shadow || '0 2px 14px 0 rgb(32 40 45 / 8%)' : 'inherit'
                },
                maxWidth: leftPad > 0 ? '100%' : maxWidth === 'sm' ? '800px' : maxWidth === 'md' ? '960px' : '1280px',
                mx: leftPad > 0 ? 2 : 'auto',
                ...sx
            }}
            style={{
                ...(others.style || {}),
                paddingLeft: leftPad
            }}
        >
            {/* card header and action */}
            {!darkTitle && title && <CardHeader sx={headerSX} title={title} action={secondary} />}
            {darkTitle && title && <CardHeader sx={headerSX} title={<Typography variant='h3'>{title}</Typography>} action={secondary} />}

            {/* content & header divider */}
            {title && <Divider />}

            {/* card content */}
            {content && (
                <CardContent sx={contentSX} className={contentClass}>
                    {children}
                </CardContent>
            )}
            {!content && children}
        </Card>
    )
})

MainCard.propTypes = {
    border: PropTypes.bool,
    boxShadow: PropTypes.bool,
    maxWidth: PropTypes.oneOf(['full', 'sm', 'md']),
    children: PropTypes.node,
    content: PropTypes.bool,
    contentClass: PropTypes.string,
    contentSX: PropTypes.object,
    darkTitle: PropTypes.bool,
    secondary: PropTypes.oneOfType([PropTypes.node, PropTypes.string, PropTypes.object]),
    shadow: PropTypes.string,
    sx: PropTypes.object,
    title: PropTypes.oneOfType([PropTypes.node, PropTypes.string, PropTypes.object])
}

export default MainCard
