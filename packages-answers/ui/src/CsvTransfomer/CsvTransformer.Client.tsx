'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
// @ts-ignore
import chatflowsApi from '@/api/chatflows'
import { User } from 'types'
// material-ui
import { Container, Box, Stack, Tabs, Tab, Typography } from '@mui/material'

import ProcessCsv from './ProcessCsv'
import ProcessingHistory from './ProcessingHistory'

function TabPanel(props: any) {
    const { children, currentValue, value, ...other } = props
    return (
        <div
            role='tabpanel'
            hidden={currentValue !== value}
            id={`admin-tabpanel-${value}`}
            aria-labelledby={`admin-tab-${value}`}
            {...other}
        >
            {currentValue === value && <Box sx={{ p: 0 }}>{children}</Box>}
        </div>
    )
}

const CsvTransformer = ({ user }: { user: User }) => {
    const [chatflows, setChatflows] = useState([])
    const searchParams = useSearchParams()
    const router = useRouter()
    const tab = searchParams.get('tab') ?? 'process'

    // Add a function to navigate to the history tab
    const navigateToHistory = () => {
        router.push('/sidekick-studio/csv-transformer?tab=history')
    }

    useEffect(() => {
        const fetchChatflows = async () => {
            const { data } = await chatflowsApi.getAllChatflows()
            setChatflows((data ?? []).filter((chatflow: any) => chatflow.category === 'csv'))
        }
        fetchChatflows()
    }, [])

    return (
        <Container>
            <Stack flexDirection='column' sx={{ gap: 3 }}>
                <Typography variant='h2' component='h1'>
                    AI CSV Transformer
                </Typography>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs value={tab} aria-label='admin tabs'>
                        <Tab label='Process CSV' value='process' component={Link} href='/sidekick-studio/csv-transformer?tab=process' />
                        <Tab
                            label='Processing History'
                            value='history'
                            component={Link}
                            href='/sidekick-studio/csv-transformer?tab=history'
                        />
                    </Tabs>
                </Box>
                <TabPanel currentValue={tab} value='process'>
                    <ProcessCsv chatflows={chatflows} user={user} onNavigateToHistory={navigateToHistory} />
                </TabPanel>
                <TabPanel currentValue={tab} value='history'>
                    <ProcessingHistory user={user} />
                </TabPanel>
            </Stack>
        </Container>
    )
}

export default CsvTransformer
