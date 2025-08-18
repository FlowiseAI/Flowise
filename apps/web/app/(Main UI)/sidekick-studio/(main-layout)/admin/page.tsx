'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { Box, Container } from '@mui/material'

const AdminDashboard = dynamic(() => import('@ui/Admin'), { ssr: false })

const Page = () => {
    return (
        <Container maxWidth='xl'>
            <Box sx={{ py: 4, p: 2 }}>
                <AdminDashboard />
            </Box>
        </Container>
    )
}

export default Page
