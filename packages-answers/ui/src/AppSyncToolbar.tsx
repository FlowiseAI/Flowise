'use client'
import axios from 'axios'
import { useFlags } from 'flagsmith/react'

import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'

import ExpandMoreIcon from '@mui/icons-material/ExpandLess'
import { useAnswers } from './AnswersContext'

import { AppSettings } from 'types'

const useSync = ({ onSync }: { onSync?: (a: string) => void }) => {
    const { filters } = useAnswers()
    const handleSync = async (serviceName: string) => {
        try {
            await axios.post(`/api/sync/${serviceName}`, { filters })
            if (onSync) onSync(serviceName)
        } catch (error) {
            console.log(error)
        }
    }
    return { handleSync }
}

const AppSyncToolbar = ({
    expanded,
    appSettings,
    onSync
}: {
    expanded?: boolean
    appSettings?: AppSettings
    onSync?: (s: string) => void
}) => {
    const flags = useFlags(['sync', 'confluence'])
    const { handleSync } = useSync({ onSync })
    // if (!flags.sync.enabled) return null;
    return (
        <Accordion
            defaultExpanded={expanded}
            sx={{
                '&, .MuiAccordion-root ': {
                    width: '100%',
                    overflow: 'hidden',
                    m: 0,
                    background: 'none',
                    boxShadow: 'none',
                    '&.Mui-expanded': {
                        margin: 0
                    },
                    '.MuiAccordionSummary-root': {
                        px: 0,
                        minHeight: 0,
                        '&.Mui-expanded': { minHeight: 0 },
                        justifyContent: 'flex-start',
                        gap: 2
                    },
                    '.MuiAccordionSummary-content': {
                        m: 0,
                        flexGrow: 'initial',
                        '&.Mui-expanded': { m: 0 }
                    },
                    '.MuiAccordionDetails-root': { p: 0, pb: 1 }
                }
            }}
        >
            <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls='filters-content' id='filters-header'>
                <Typography variant='overline'>Sync</Typography>
            </AccordionSummary>
            <AccordionDetails>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Button
                        key={'Settings'}
                        sx={{
                            position: 'relative'
                        }}
                        variant='outlined'
                        color='primary'
                        onClick={() => handleSync('settings')}
                    >
                        Settings
                    </Button>
                    {appSettings?.services?.map((service) => (
                        <Button
                            key={service?.name}
                            sx={{
                                position: 'relative'
                            }}
                            variant='outlined'
                            color='primary'
                            disabled={!service.enabled && !(flags[service.id] as any)?.enabled}
                            onClick={() => handleSync(service?.name)}
                        >
                            {service.name}
                        </Button>
                    ))}
                </Box>
            </AccordionDetails>
        </Accordion>
    )
}
export default AppSyncToolbar
