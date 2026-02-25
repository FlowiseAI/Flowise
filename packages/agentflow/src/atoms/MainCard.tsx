import { forwardRef, ReactNode } from 'react'

import { Card, CardContent, CardHeader, Divider, SxProps, Theme, Typography } from '@mui/material'

const headerSX = {
    '& .MuiCardHeader-action': { mr: 0 }
}

export interface MainCardProps {
    border?: boolean
    boxShadow?: boolean
    maxWidth?: 'full' | 'sm' | 'md'
    children?: ReactNode
    content?: boolean
    contentClass?: string
    contentSX?: SxProps<Theme>
    darkTitle?: boolean
    secondary?: ReactNode
    shadow?: string
    sx?: SxProps<Theme>
    title?: ReactNode
}

/**
 * Custom main card component for wrapping content
 */
export const MainCard = forwardRef<HTMLDivElement, MainCardProps>(function MainCard(
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
        border,
        ...others
    },
    ref
) {
    return (
        <Card
            ref={ref}
            {...others}
            sx={{
                background: 'transparent',
                ':hover': {
                    boxShadow: boxShadow ? shadow || '0 2px 14px 0 rgb(32 40 45 / 8%)' : 'inherit'
                },
                maxWidth: maxWidth === 'sm' ? '800px' : maxWidth === 'md' ? '960px' : '1280px',
                mx: 'auto',
                border: border === false ? 'none' : border ? '1px solid' : undefined,
                ...(sx as object)
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

export default MainCard
