'use client'
import React, { useState } from 'react'
import NextLink from 'next/link'
import { useFlags } from 'flagsmith/react'

import Box from '@mui/material/Box'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import Button from '@mui/material/Button'

import SnackMessage from './SnackMessage'
import SidekickList from './SidekickList'

import { AppSettings } from 'types'

const SidekickTabs = ({ appSettings }: { appSettings: AppSettings }) => {
    const flags = useFlags(['sidekicks_system'])
    const [currentTab, setCurrentTab] = useState('Favorites')
    const [isLoading, setIsLoading] = useState(true)

    const getEndpoint = React.useCallback((tab: string) => {
        // Map the tab to the corresponding endpoint
        if (tab === 'Favorites') {
            return '/api/sidekicks/list/favorite'
        } else if (tab === 'Private') {
            return '/api/sidekicks/list/private'
        } else if (tab === 'Organization') {
            return '/api/sidekicks/list/org'
        } else if (tab === 'Global') {
            return '/api/sidekicks/list/global'
        } else if (tab === 'AnswerAI') {
            return '/api/sidekicks/list/system'
        } else {
            return ''
        }
    }, [])

    const handleTabChange = (event: React.SyntheticEvent, newTab: string) => {
        setCurrentTab(newTab)
    }

    return (
        <Box p={8}>
            <SnackMessage message={isLoading ? '...Loading' : ''} />

            <Typography variant='h2' component='h1'>
                Sidekicks
            </Typography>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ textAlign: 'right', mb: 2 }}>
                <NextLink href='/sidekick-studio/new' passHref>
                    <Button variant='outlined'>Add New Sidekick</Button>
                </NextLink>
            </Box>

            <Tabs value={currentTab} onChange={handleTabChange} centered sx={{ mb: 4 }}>
                <Tab label='Answer AI' value='AnswerAI' />
                <Tab label='My Favorites' value='Favorites' />
                <Tab label='My Sidekicks' value='Private' />
                <Tab label='Organization' value='Organization' />
                <Tab label='Global' value='Global' />
            </Tabs>

            <Box role='tabpanel' hidden={currentTab !== 'Favorites'}>
                <SidekickList endpoint={getEndpoint('Favorites')} appSettings={appSettings} />
            </Box>
            <Box role='tabpanel' hidden={currentTab !== 'Private'}>
                <SidekickList endpoint={getEndpoint('Private')} appSettings={appSettings} />
            </Box>
            <Box role='tabpanel' hidden={currentTab !== 'Organization'}>
                <SidekickList endpoint={getEndpoint('Organization')} appSettings={appSettings} />
            </Box>
            <Box role='tabpanel' hidden={currentTab !== 'Global'}>
                <SidekickList endpoint={getEndpoint('Global')} appSettings={appSettings} />
            </Box>
            <Box role='tabpanel' hidden={currentTab !== 'AnswerAI'}>
                <SidekickList endpoint={getEndpoint('AnswerAI')} appSettings={appSettings} />
            </Box>
        </Box>
    )
}

export default SidekickTabs
