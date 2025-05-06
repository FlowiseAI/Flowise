'use client'

import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'

import Grid2 from '@mui/material/Unstable_Grid2/Grid2'

import { AppSettings } from 'types'

import { AppsDrawer } from './AppsDrawer'
import { AnswersProvider } from './AnswersContext'

export const IntegrationsSettings = ({ appSettings, activeApp }: { appSettings: AppSettings; activeApp?: string }) => {
    // const flags = useFlags(['settings']);

    // if (!flags?.settings?.enabled) return redirect('/');
    return (
        <AnswersProvider appSettings={appSettings}>
            <Container
                sx={{
                    flex: 1,
                    height: '100%',
                    position: 'relative',
                    py: 2,
                    px: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4
                }}
            >
                <Box>
                    <Typography variant='h4'>Integrations</Typography>
                    <Typography>Manage your data sources and other connections</Typography>
                </Box>

                <Grid2 container sx={{ gap: 2, width: '100%' }}>
                    <AppsDrawer appSettings={appSettings} activeApp={activeApp} />
                </Grid2>
            </Container>
        </AnswersProvider>
    )
}
