'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import CheckCircle from '@mui/icons-material/CheckCircle'
import { DocumentFilter } from 'types'
import { CircularProgress, Typography } from '@mui/material'
import SyncProblem from '@mui/icons-material/SyncProblem'
import axios from 'axios'

const POLLING_INTERVAL = 3000

export const FilterStatus = ({ documentFilter, source }: { documentFilter: DocumentFilter; source: string }) => {
    const [status, setStatus] = useState<string | undefined>()
    const [itemsCount, setItemsCount] = useState(0)

    const timeoutRef = useRef<NodeJS.Timeout | null>(null)
    const remainingPollsRef = useRef<number>(30)

    const statusUrl = useMemo(
        () =>
            `/api/sources/status?source=${source}&${
                documentFilter.documentId ? `id=${documentFilter.documentId}&` : ''
            }filter=${JSON.stringify(documentFilter.filter)}`,
        [documentFilter.filter, documentFilter.documentId, source]
    )

    const pollStatus = useCallback(async () => {
        try {
            const { data } = await axios.get(statusUrl)
            const { count, status: polledStatus, error } = data

            if (error) {
                setStatus(undefined)
                return
            }

            if (polledStatus) {
                setStatus(polledStatus)
            }
            setItemsCount(count || 0)

            if (polledStatus !== 'synced' && polledStatus != 'error' && remainingPollsRef.current > 0) {
                remainingPollsRef.current--
                timeoutRef.current = setTimeout(pollStatus, POLLING_INTERVAL)
                return
            }
            if (remainingPollsRef.current <= 0) {
                setStatus(undefined)
            }
        } catch (err: any) {
            console.error(err)
            setStatus(undefined)
        }
    }, [statusUrl])

    useEffect(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
        }
        pollStatus()

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
            }
        }
    }, [pollStatus])

    return (
        <>
            {itemsCount > 1 ? (
                <Typography>{itemsCount} records</Typography>
            ) : !status ? null : status === 'synced' ? (
                <CheckCircle fontSize='medium' color='success' />
            ) : status === 'error' ? (
                <SyncProblem fontSize='medium' color='error' />
            ) : (
                <CircularProgress size='1.5rem' color='info' />
            )}
        </>
    )
}
