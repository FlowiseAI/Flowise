'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { Box, Container } from '@mui/material'

const AdminDocumentStores = dynamic(() => import('@ui/Admin/DocumentStores'), { ssr: false })

const Page = () => {
    return (
        <Container maxWidth='xl'>
            <Box sx={{ py: 4, p: 2 }}>
                <AdminDocumentStores />
            </Box>
        </Container>
    )
}

export default Page
