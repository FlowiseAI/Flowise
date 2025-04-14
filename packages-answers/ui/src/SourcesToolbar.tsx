import * as React from 'react'
import { useFlags } from 'flagsmith/react'

import Box from '@mui/material/Box'
import Collapse from '@mui/material/Collapse'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Typography from '@mui/material/Typography'
import Avatar from '@mui/material/Avatar'

import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLess from '@mui/icons-material/ExpandLess'
import ExpandMore from '@mui/icons-material/ExpandMore'

import { useAnswers } from './AnswersContext'

import JourneySetting from './JourneySetting'
import { Filters } from './Filters'
import { Accordion, AccordionDetails, AccordionSummary } from './Accordion'

import { AppSettings, AppService } from 'types'

export default function SourcesToolbar({ appSettings }: { appSettings: AppSettings }) {
    const flags = useFlags(appSettings?.services?.map((s) => s.id) ?? [])

    const enabledServices: AppService[] | undefined = React.useMemo(
        () =>
            appSettings?.services?.filter((service) => {
                return (flags?.[service.id] as any)?.enabled
            }) ?? [],
        [appSettings?.services, flags]
    )

    const { filters, showFilters, updateFilter } = useAnswers()

    const [opened, setOpened] = React.useState<string>('')

    const handleOpenToggle = (serviceId: string) => (opened != serviceId ? setOpened(serviceId) : setOpened(''))

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 1
            }}
        >
            <Accordion
                expanded={!!Object.keys(filters)?.length}
                sx={{
                    '&.MuiPaper-root': {
                        borderBottom: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: 0,
                        py: 1,
                        display: Object.keys(filters)?.length ? 'block' : 'none'
                    }
                }}
            >
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: '48px!important' }}>
                    <Typography variant='overline'>Selected sources</Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ padding: '8px!important', px: 1 }}>
                    <Filters />
                </AccordionDetails>
            </Accordion>

            <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: '48px!important' }}>
                    <Typography variant='overline'>Add new sources</Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ padding: '0px!important' }}>
                    <List disablePadding sx={{ gap: 1 }}>
                        {enabledServices?.map((service, idx) => (
                            <React.Fragment key={service.id}>
                                <ListItem
                                    key={service.id}
                                    disablePadding
                                    sx={{
                                        gap: 1,
                                        flexDirection: 'column',
                                        '.MuiIconButton-root': { opacity: 1, transition: '.1s', overflow: 'hidden' },
                                        '&:not(:hover)': {
                                            '.MuiIconButton-root': {
                                                opacity: 0,
                                                px: 0,
                                                width: 0
                                            }
                                        }
                                    }}
                                >
                                    <ListItemButton onClick={() => handleOpenToggle(service.id)} sx={{ width: '100%', paddingRight: 1 }}>
                                        <ListItemIcon sx={{ minWidth: 0, mr: 2 }}>
                                            <Avatar variant='source' src={service.imageURL} sx={{ width: 24, height: 24 }} />
                                        </ListItemIcon>
                                        <ListItemText primary={service.name} sx={{ textTransform: 'capitalize' }} />

                                        {opened == service.id ? <ExpandLess /> : <ExpandMore />}
                                    </ListItemButton>
                                    <Collapse in={opened == service.id} sx={{ width: '100%' }}>
                                        {opened == service.id ? (
                                            <JourneySetting
                                                app={service.id}
                                                appSettings={appSettings}
                                                filters={filters}
                                                updateFilter={updateFilter}
                                            />
                                        ) : null}
                                    </Collapse>
                                </ListItem>
                            </React.Fragment>
                        ))}
                    </List>
                </AccordionDetails>
            </Accordion>
        </Box>
    )
}
