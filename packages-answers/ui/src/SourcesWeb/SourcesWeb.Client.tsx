'use client'
import React, { useState } from 'react'
import axios from 'axios'
import useSWR from 'swr'

import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'

import { getUrlDomain } from '@utils/getUrlDomain'
import { throttle } from '@utils/throttle'

import Autocomplete from '../VirtualAutocomplete'
import { useAnswers } from '../AnswersContext'

import DomainCard from './DomainCard'

import { DocumentFilter } from 'types'
import { getDocumentSourceKey } from '@utils/getDocumentSourceKey'
import { Chip, Typography } from '@mui/material'

const SourcesWeb: React.FC<{ isJourney?: boolean }> = ({ isJourney }) => {
    const { filters, updateFilter } = useAnswers()
    const [currentInput, setCurrentInput] = useState('')
    const [url, setUrl] = useState('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const updateUrl = React.useCallback(throttle(setUrl, 600), [])

    interface Data {
        urlSources: DocumentFilter[]
        domainSources: (DocumentFilter & { count: number })[]
    }

    const { data, mutate } = useSWR<Data>(url, (urlVal) =>
        Promise.all([
            fetch(`/api/sources/web/url?url=${urlVal}`)
                .then((res) => res.json())
                .then((data) => data?.sources ?? []),
            fetch(`/api/sources/web/domain?url=${urlVal}`)
                .then((res) => res.json())
                .then((data) => data?.sources ?? [])
        ]).then(([urlSources, domainSources]) => ({
            urlSources: urlSources,
            domainSources: domainSources
        }))
    )

    const urlDomain = React.useMemo(() => {
        if (!currentInput) return null
        return getUrlDomain(currentInput)
    }, [currentInput])

    const currentUrlSources = data?.urlSources ?? []
    const currentDomainSources = data?.domainSources ?? []

    const filterUrlSources = React.useMemo(() => filters?.datasources?.web?.url?.sources ?? [], [filters?.datasources?.web?.url?.sources])
    const filterDomainSources = React.useMemo(
        () => filters?.datasources?.web?.domain?.sources ?? [],
        [filters?.datasources?.web?.domain?.sources]
    )

    const handleAddUrl = async (newWebUrl: string) => {
        if (!newWebUrl) return
        const { data } = await axios.post<DocumentFilter>(`/api/sync/web/url`, {
            url: newWebUrl
        })
        const newWebURLs = [...(filterUrlSources ?? []), data]
        updateFilter({
            datasources: { web: { url: { sources: newWebURLs } } }
        })

        setCurrentInput('')
    }

    const addDomainFilter = async (domain: string) => {
        if (!domain) return
        const { data } = await axios.post<DocumentFilter>(`/api/sync/web/domain`, {
            domain
        })
        const newDomains = [...filterDomainSources, data]
        updateFilter({
            datasources: { web: { domain: { sources: newDomains } } }
        })

        await mutate()
    }

    const handleRemoveDomain = async (domain: DocumentFilter) => {
        const newDomain = filterDomainSources.filter((d) => {
            return JSON.stringify(d) !== JSON.stringify(domain)
        })

        updateFilter({
            datasources: { web: { domain: { sources: newDomain } } }
        })
    }

    const handleRemoveUrl = async (webObj: DocumentFilter) => {
        const newUrlObj = filterUrlSources.filter((obj) => {
            return JSON.stringify(obj) !== JSON.stringify(webObj)
        })

        updateFilter({
            datasources: { web: { url: { sources: newUrlObj } } }
        })
    }

    return (
        <>
            <Box marginBottom={1} sx={{ display: 'flex', gap: 2, flexDirection: 'column' }}>
                {isJourney && (
                    <>
                        {filterDomainSources.length ? (
                            <Box>
                                <Typography variant='overline'>Domains</Typography>
                                <Box sx={{ gap: 1, display: 'flex', flexWrap: 'wrap' }}>
                                    {filterDomainSources.map((domain) => (
                                        <Chip
                                            key={`domain-chip-${JSON.stringify(domain)}`}
                                            size='small'
                                            label={domain.label}
                                            onDelete={() => handleRemoveDomain(domain)}
                                        />
                                    ))}
                                </Box>
                            </Box>
                        ) : null}

                        {filterUrlSources.length ? (
                            <Box>
                                <Typography variant='overline'>Pages</Typography>
                                <Box sx={{ gap: 1, display: 'flex', flexWrap: 'wrap' }}>
                                    {filterUrlSources.map((document) => (
                                        <Chip
                                            key={`page-chip-${JSON.stringify(document)}`}
                                            size='small'
                                            label={document.label}
                                            onDelete={() => handleRemoveUrl(document)}
                                        />
                                    ))}
                                </Box>
                            </Box>
                        ) : null}
                    </>
                )}

                <Autocomplete
                    freeSolo
                    options={currentUrlSources.map((source) => source.label) ?? []}
                    // value={filters?.datasources?.web?.documents || []}
                    onInputChange={(e: any, value: any) => {
                        setCurrentInput(value)
                        updateUrl(value)
                    }}
                    onChange={(e: any, value: any) => {
                        if (value) {
                            handleAddUrl(value)
                            setCurrentInput('')
                        }
                    }}
                    selectOnFocus
                    // clearOnBlur
                    renderInput={(params: any) => (
                        <TextField {...params} label='URL' value={currentInput} sx={{ minHeight: 56 }} variant='outlined' fullWidth />
                    )}
                />
            </Box>

            {currentDomainSources?.length ? (
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: 1 }}>
                    {currentDomainSources.map((source) =>
                        filterDomainSources.map((d) => d.filter).includes(source.filter) ? null : (
                            <DomainCard
                                key={`domain-card-${getDocumentSourceKey('web', 'domain', source)}`}
                                domain={source.label}
                                pageCount={source.count}
                                onClick={() => addDomainFilter(source.filter.domain)}
                            />
                        )
                    )}
                </Box>
            ) : null}

            {urlDomain && !currentDomainSources?.length && !filterDomainSources.map((d) => d.filter.domain).includes(urlDomain) ? (
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: 1 }}>
                    <DomainCard domain={urlDomain} urls={[]} onClick={() => addDomainFilter(urlDomain)} />
                </Box>
            ) : null}

            {/* {sources?.length ? <DocumentTree documents={sources} /> : null} */}
        </>
    )
}

export default SourcesWeb
