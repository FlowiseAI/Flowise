import React from 'react'
import { Box, Typography } from '@mui/material'

interface StatCardProps {
    title: string
    value: string | number
    subtitle?: string
    loading?: boolean
    sx?: any
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, loading = false, sx = {} }) => {
    return (
        <Box
            sx={{
                bgcolor: 'rgba(255, 255, 255, 0.05)',
                p: 2,
                borderRadius: '8px',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                textAlign: 'center',
                ...sx
            }}
        >
            <Typography sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', mb: 1 }}>{title}</Typography>
            <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: '1.5rem' }}>{loading ? '...' : value}</Typography>
            {subtitle && <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.75rem', mt: 0.5 }}>{subtitle}</Typography>}
        </Box>
    )
}

export default StatCard
