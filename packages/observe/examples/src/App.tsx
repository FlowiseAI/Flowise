import { useState } from 'react'

import { ObserveProvider } from '@flowiseai/observe'
import { Box, CssBaseline, FormControlLabel, Stack, Switch, Tab, Tabs, Typography } from '@mui/material'

import ExecutionsViewerExample from './demos/ExecutionsViewerExample'
import StandaloneDetailExample from './demos/StandaloneDetailExample'
import { apiBaseUrl, token } from './config'

export default function App() {
    const [tab, setTab] = useState(0)
    const [isDarkMode, setIsDarkMode] = useState(false)

    return (
        <ObserveProvider apiBaseUrl={apiBaseUrl} token={token} isDarkMode={isDarkMode}>
            <CssBaseline />
            <Box
                sx={{
                    p: 3,
                    minHeight: '100vh',
                    backgroundColor: 'background.default',
                    color: 'text.primary'
                }}
            >
                <Stack direction='row' alignItems='center' justifyContent='space-between' sx={{ mb: 2 }}>
                    <Typography variant='h4' sx={{ fontWeight: 700 }}>
                        @flowiseai/observe — Examples
                    </Typography>
                    <FormControlLabel control={<Switch checked={isDarkMode} onChange={(_, v) => setIsDarkMode(v)} />} label='Dark mode' />
                </Stack>
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
