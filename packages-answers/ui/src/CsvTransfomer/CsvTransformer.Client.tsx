'use client'
import { useState, useEffect } from 'react'
// @ts-ignore
import chatflowsApi from '@/api/chatflows'
import { User } from 'types'
// material-ui
import { Container, Box, Stack, Tabs, Tab, Typography } from '@mui/material'

import ProcessCsv from './ProcessCsv'
import ProcessingHistory from './ProcessingHistory'

function TabPanel(props: any) {
    const { children, value, index, ...other } = props
    return (
        <div role='tabpanel' hidden={value !== index} id={`admin-tabpanel-${index}`} aria-labelledby={`admin-tab-${index}`} {...other}>
            {value === index && <Box sx={{ p: 0 }}>{children}</Box>}
        </div>
    )
}

const CsvTransformer = ({ user }: { user: User }) => {
    const [tabValue, setTabValue] = useState(0)
    const [chatflows, setChatflows] = useState([])
    const handleTabChange = (event: any, newValue: any) => {
        setTabValue(newValue)
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
                    <Tabs value={tabValue} onChange={handleTabChange} aria-label='admin tabs'>
                        <Tab label='Process CSV' />
                        <Tab label='Processing History' />
                    </Tabs>
                </Box>
                <TabPanel value={tabValue} index={0}>
                    <ProcessCsv chatflows={chatflows} user={user} />
                </TabPanel>
                <TabPanel value={tabValue} index={1}>
                    <ProcessingHistory user={user} />
                </TabPanel>
            </Stack>
        </Container>
    )
}

export default CsvTransformer
