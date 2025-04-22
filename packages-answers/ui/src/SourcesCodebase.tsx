'use client'
import React from 'react'
import useSWR from 'swr'

import Box from '@mui/material/Box'

import Autocomplete from './AutocompleteSelect'
import { useAnswers } from './AnswersContext'

import { DocumentFilter } from 'types'

const SourcesCodebase: React.FC<{}> = () => {
    const { filters, updateFilter } = useAnswers()
    const { data: sources, mutate } = useSWR<DocumentFilter[]>(
        `/api/sources/codebase`,
        (doc) =>
            fetch(doc)
                .then((res) => res.json())
                .then((data) => data?.sources ?? []),
        {
            dedupingInterval: 1000
        }
    )

    const filterSources = filters?.datasources?.codebase?.repo?.sources ?? []

    return (
        <>
            <Box marginBottom={1} sx={{ display: 'flex', gap: 2, flexDirection: 'column' }}>
                <Autocomplete
                    label='Choose a repo'
                    value={filterSources}
                    onChange={(value) => updateFilter({ datasources: { codebase: { repo: { sources: value } } } })}
                    getOptionLabel={(option) => option.label}
                    options={sources ?? []}
                    onFocus={() => mutate()}
                />
            </Box>
        </>
    )
}

export default SourcesCodebase
