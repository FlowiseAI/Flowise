import * as React from 'react'
import { useFlags } from 'flagsmith/react'
import Image from 'next/image'

import Avatar from '@mui/material/Avatar'
import AvatarGroup from '@mui/material/AvatarGroup'
import Box from '@mui/material/Box'
import Popover from '@mui/material/Popover'
import Typography from '@mui/material/Typography'

import { useAnswers } from './AnswersContext'

import SourcesWeb from './SourcesWeb'
import SourcesJira from './SourcesJira'
import SourcesConfluence from './SourcesConfluence'
import SourcesAirtable from './SourcesAirtable'
import SourcesCodebase from './SourcesCodebase'
import SourcesSlack from './SourcesSlack'
import SourcesDocument from './SourcesDocument'

import { AppSettings, AppService } from 'types'

export default function JourneySources({ appSettings }: { appSettings: AppSettings }) {
    const serviceRefs = React.useRef<{ [key: string]: HTMLDivElement }>({})

    const flags = useFlags(appSettings?.services?.map((s) => s.name) ?? [])

    const enabledServices: AppService[] | undefined = appSettings?.services?.filter((service) => {
        const isServiceEnabledInFlags = (flags?.[service.id] as any)?.enabled
        return isServiceEnabledInFlags || service.enabled
    })

    const [serviceOpen, setServiceOpen] = React.useState<string>('')
    const { filters, updateFilter } = useAnswers()
    const selectedService = enabledServices?.find((service) => service.id === serviceOpen)

    return (
        <>
            <AvatarGroup total={enabledServices?.length} max={10} spacing={-8}>
                {enabledServices
                    ?.map((service, idx) => [
                        <Avatar
                            key={service.id}
                            alt={service.name}
                            ref={(ref) => {
                                if (ref) serviceRefs.current[service.id] = ref
                            }}
                            onClick={() => setServiceOpen(service.id)}
                        >
                            {service.imageURL ? (
                                <Image
                                    style={{ background: 'white', padding: '8px' }}
                                    src={service.imageURL}
                                    alt={`${service.name} logo`}
                                    width={40}
                                    height={40}
                                />
                            ) : (
                                service.name[0]?.toUpperCase()
                            )}
                        </Avatar>
                    ])
                    .flat()}
            </AvatarGroup>
            {selectedService ? (
                <Popover
                    key={selectedService?.name}
                    open
                    anchorEl={serviceRefs.current[serviceOpen]}
                    onClose={() => setServiceOpen('')}
                    PaperProps={{
                        sx: {
                            marginLeft: '-2px',
                            marginTop: '-4px'
                        }
                    }}
                    anchorOrigin={{
                        vertical: 'top',
                        horizontal: 'right'
                    }}
                    transformOrigin={{
                        vertical: 'top',
                        horizontal: 'right'
                    }}
                >
                    <Box sx={{ width: 320, px: 2, py: 2 }}>
                        <Typography variant='overline' sx={{ fontWeight: 'bold', textTransform: 'capitalize' }}>
                            {serviceOpen} filters
                        </Typography>
                        <Box
                            sx={{
                                display: 'flex',
                                gap: 2,
                                flexDirection: 'column'
                            }}
                        >
                            {selectedService.id === 'slack' ? (
                                <SourcesSlack appSettings={appSettings} filters={filters} updateFilter={updateFilter} />
                            ) : null}

                            {flags?.codebase?.enabled && selectedService.id === 'codebase' ? <SourcesCodebase /> : null}

                            {flags?.document?.enabled && selectedService.id === 'document' ? <SourcesDocument /> : null}

                            {flags?.airtable?.enabled && selectedService.id === 'airtable' ? (
                                <SourcesAirtable appSettings={appSettings} filters={filters} updateFilter={updateFilter} />
                            ) : null}

                            {serviceOpen === 'confluence' ? (
                                <SourcesConfluence appSettings={appSettings} filters={filters} updateFilter={updateFilter} />
                            ) : null}

                            {serviceOpen === 'web' ? <SourcesWeb /> : null}

                            {serviceOpen === 'jira' ? (
                                <SourcesJira appSettings={appSettings} filters={filters} updateFilter={updateFilter} />
                            ) : null}
                        </Box>
                    </Box>
                </Popover>
            ) : null}
        </>
    )
}
