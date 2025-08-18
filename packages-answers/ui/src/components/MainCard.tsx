import React from 'react'
import { Card, CardContent } from '@mui/material'

interface MainCardProps {
    children: React.ReactNode
    sx?: any
}

const MainCard: React.FC<MainCardProps> = ({ children, sx = {} }) => {
    return (
        <Card
            elevation={0}
            sx={{
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                bgcolor: 'rgba(0, 0, 0, 0.2)',
                backdropFilter: 'blur(20px)',
                maxWidth: '1280px',
                mx: 'auto',
                ...sx
            }}
        >
            <CardContent sx={{ p: 0 }}>{children}</CardContent>
        </Card>
    )
}

export default MainCard
