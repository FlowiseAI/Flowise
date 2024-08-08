'use client'
import React, { useMemo } from 'react'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import ClearIcon from '@mui/icons-material/Clear'
import { useAnswers } from './AnswersContext'

import { AppService, DocumentFilter, SourceFilters } from 'types'
import { FilterStatus } from './FilterStatus'

export const Filters = ({ sx }: { sx?: any }) => {
    const { filters, appSettings, updateFilter } = useAnswers()

    const services: { [key: string]: AppService } = useMemo(
        () => appSettings?.services?.reduce((acc, service) => ({ ...acc, [service.id]: service }), {}) ?? {},
        [appSettings?.services]
    )

    const datasourceEntries: [string, SourceFilters][] = useMemo(
        () => Object.entries(filters?.datasources ?? {}) ?? [],
        [filters?.datasources]
    )

    return datasourceEntries.length ? (
        <>
            {/* <strong>
        <Typography variant="overline">Selected sources</Typography>
      </strong> */}
            <Box
                sx={{
                    display: 'flex',
                    gap: 1,
                    flexDirection: 'column',
                    flexWrap: 'wrap',
                    width: '100%',
                    ...sx
                }}
            >
                <>
                    {datasourceEntries.map(([source, sourceFilters]) => {
                        if (!sourceFilters || !Object.keys(sourceFilters).length) return null
                        return (
                            <React.Fragment key={source}>
                                {Object.entries(sourceFilters)?.map(([filterKey, { sources }]) => {
                                    return (
                                        sources?.length && (
                                            <React.Fragment key={`${source}_${filterKey}`}>
                                                {sources.map((documentFilter: DocumentFilter) => (
                                                    <Button
                                                        color='inherit'
                                                        variant='text'
                                                        size='small'
                                                        sx={{
                                                            width: '100%',
                                                            borderRadius: '24px',
                                                            textTransform: 'none',
                                                            display: 'flex',
                                                            alignItems: 'center'
                                                        }}
                                                        startIcon={
                                                            <Avatar
                                                                variant='source'
                                                                sx={{ height: 20, width: 20 }}
                                                                src={services[source]?.imageURL}
                                                            />
                                                        }
                                                        onClick={() => {
                                                            const newSources: DocumentFilter[] = (
                                                                ((filters?.datasources as any)?.[source]?.[filterKey]?.sources as any[]) ??
                                                                []
                                                            )?.filter((v) => JSON.stringify(v) !== JSON.stringify(documentFilter))
                                                            updateFilter({
                                                                datasources: {
                                                                    [source]: {
                                                                        [filterKey]: {
                                                                            sources: newSources
                                                                        }
                                                                    }
                                                                }
                                                            })
                                                        }}
                                                        endIcon={
                                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                                <FilterStatus documentFilter={documentFilter} source={source} />
                                                                <ClearIcon />
                                                            </Box>
                                                        }
                                                        key={`${source}:${filterKey}:${documentFilter.filter}`}
                                                    >
                                                        <Typography
                                                            variant='body2'
                                                            sx={{
                                                                textAlign: 'left',
                                                                width: '100%',

                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap'
                                                            }}
                                                        >
                                                            {documentFilter.label}
                                                        </Typography>
                                                    </Button>
                                                ))}
                                            </React.Fragment>
                                        )
                                    )
                                })}
                            </React.Fragment>
                        )
                    })}
                </>
            </Box>
        </>
    ) : null
}
