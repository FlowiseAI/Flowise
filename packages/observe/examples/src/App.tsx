import { useState } from 'react'

import { ObserveProvider } from '@flowiseai/observe'
import { Box, CssBaseline, Tab, Tabs, Typography } from '@mui/material'

import ExecutionsViewerExample from './demos/ExecutionsViewerExample'
import StandaloneDetailExample from './demos/StandaloneDetailExample'
import { apiBaseUrl, token } from './config'

import '@flowiseai/observe/observe.css'

export default function App() {
    const [tab, setTab] = useState(0)

    return (
        <ObserveProvider apiBaseUrl={apiBaseUrl} token={token}>
            <CssBaseline />
            <Box sx={{ p: 3 }}>
                <Typography variant='h4' sx={{ mb: 2, fontWeight: 700 }}>
                    @flowiseai/observe — Examples
                </Typography>
                <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
                    <Tab label='Executions Viewer' />
                    <Tab label='Standalone ExecutionDetail' />
                </Tabs>
                {tab === 0 && <ExecutionsViewerExample />}
                {tab === 1 && <StandaloneDetailExample />}
            </Box>
        </ObserveProvider>
    )
}
