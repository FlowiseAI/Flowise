'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { Box, Container } from '@mui/material'

const AdminChatflows = dynamic(() => import('@ui/Admin/Chatflows'), { ssr: false })

const Page = () => {
    return (
        <Container maxWidth='xl'>
            <Box sx={{ py: 4, p: 2 }}>
                <AdminChatflows />
            </Box>
        </Container>
    )
}

export default Page
