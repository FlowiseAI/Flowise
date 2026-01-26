import React from 'react'
import { Card, CardContent } from '@mui/material'
import { styled } from '@mui/material/styles'

interface MainCardProps {
    children: React.ReactNode
    content?: boolean
    sx?: any
    border?: boolean
    [key: string]: any
}

const StyledCard = styled(Card)(({ theme }) => ({
    border: '1px solid',
    borderColor: theme.palette.divider,
    ':hover': {
        boxShadow: '0 2px 14px 0 rgb(32 40 45 / 8%)'
    }
}))

const MainCard: React.FC<MainCardProps> = ({ children, content = true, sx = {}, border = true, ...others }) => {
    return (
        <StyledCard
            sx={{
                border: border ? undefined : 'none',
                ...sx
            }}
            {...others}
        >
            {content ? <CardContent>{children}</CardContent> : children}
        </StyledCard>
    )
}

export default MainCard
