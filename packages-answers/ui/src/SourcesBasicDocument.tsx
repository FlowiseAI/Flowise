'use client'
import React from 'react'
import useSWR from 'swr'

import Box from '@mui/material/Box'

import Autocomplete from './AutocompleteSelect'
import { useAnswers } from './AnswersContext'
import NewDocumentModal from './NewDocumentModal'

import { FilterDatasources, DocumentFilter, StandardDocumentUrlFilters } from 'types'

const SourcesBasicDocument: React.FC<{
    source: keyof FilterDatasources
    label: string
    placeholder: string
}> = ({ source, label, placeholder }) => {
    const { filters, updateFilter } = useAnswers()
    const { data: sources, mutate } = useSWR<DocumentFilter[]>(
        `/api/sources/${source}`,
        (url) =>
            fetch(url)
                .then((res) => res.json())
                .then((data) => data.sources),
        {
            dedupingInterval: 1000
        }
    )

    const sourceFilterSources: DocumentFilter[] = (filters?.datasources?.[source] as StandardDocumentUrlFilters)?.url?.sources ?? []

    return (
        <>
            <Box marginBottom={1} sx={{ display: 'flex', gap: 2, flexDirection: 'column' }}>
                <Autocomplete
                    label={label}
                    placeholder={placeholder}
                    value={sourceFilterSources}
                    onChange={(selectedValues) => updateFilter({ datasources: { [source]: { url: { sources: selectedValues } } } })}
                    getOptionLabel={(option) => option.label}
                    options={sources ?? []}
                    onFocus={() => mutate()}
                />
                <NewDocumentModal
                    source={source}
                    onSave={() => {
                        setTimeout(mutate, 2000)
                    }}
                />
            </Box>
        </>
    )
}

export default SourcesBasicDocument
