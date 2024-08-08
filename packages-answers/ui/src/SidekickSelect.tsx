import React, { useState, useEffect, useMemo } from 'react'

import Select from '@mui/material/Select'
import type { SelectChangeEvent } from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'

import Fieldset from './Fieldset'
import type { Sidekick } from 'types'
import useSWR from 'swr'
import { useRouter } from 'next/navigation'

interface SidekickSelectProps {
    onSidekickSelected: (sidekick: Sidekick) => void
    sidekicks?: Sidekick[]
}

const SidekickSelect = ({ onSidekickSelected, sidekicks: defaultSidekicks = [] }: SidekickSelectProps) => {
    const router = useRouter()
    // Implement the sidekicsk state using useSWR with the /api/sidekicks endpoint, use the sidekicks in the props as initial state
    const fetcher = async (url: string) => {
        try {
            const res = await fetch(url)
            if (res.status === 401) {
                router.push('/api/auth/login?returnTo=' + encodeURIComponent(window.location.href))
            }
            return res.json()
        } catch (error) {
            // Handle unauthorized response
            console.log(error)

            return []
        }
    }
    const { data: allSidekicks = [] } = useSWR('/api/sidekicks', fetcher, {
        fallback: defaultSidekicks
    })

    const [selectedSidekick, setSelectedSidekick] = useState<number>(0)
    const sidekicks = useMemo(() => [...allSidekicks].sort((a, b) => a.label.localeCompare(b.label)), [allSidekicks])

    useEffect(() => {
        const sidekickHistory = JSON.parse(localStorage.getItem('sidekickHistory') || '{}')
        const lastUsedSidekick = sidekickHistory?.lastUsed
        let sidekickIdx = sidekicks.findIndex((s) => s.id === lastUsedSidekick?.id)
        if (sidekickIdx == -1) return
        const curSidekick = sidekicks[sidekickIdx]

        setSelectedSidekick(sidekickIdx)
        if (curSidekick) onSidekickSelected(curSidekick)
    }, [sidekicks, onSidekickSelected])

    const handleSidekickChange = (event: SelectChangeEvent<string>) => {
        const sidekickIdx = parseInt(event.target.value)
        const curSidekick = sidekicks[sidekickIdx]
        console.log('SidekickSelect', { event, sidekickIdx, curSidekick })

        setSelectedSidekick(sidekickIdx)
        if (curSidekick) {
            onSidekickSelected(curSidekick)
        }

        const sidekickHistory = JSON.parse(localStorage.getItem('sidekickHistory') || '{}')
        sidekickHistory.lastUsed = curSidekick
        localStorage.setItem('sidekickHistory', JSON.stringify(sidekickHistory))
    }

    return (
        <>
            {sidekicks.length > 0 && (
                <Select
                    color='secondary'
                    variant='outlined'
                    labelId='sidekick-select-label'
                    id='sidekick-select'
                    size='small'
                    sx={{ boxShadow: 'none' }}
                    value={selectedSidekick?.toString()}
                    onChange={handleSidekickChange}
                >
                    {sidekicks.map((sidekick: Sidekick, idx: number) => (
                        <MenuItem key={sidekick.id} value={idx}>
                            {sidekick.label}
                        </MenuItem>
                    ))}
                </Select>
            )}
        </>
    )
}

export default SidekickSelect
