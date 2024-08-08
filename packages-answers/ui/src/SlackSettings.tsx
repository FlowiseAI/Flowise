'use client'
import React, { useState } from 'react'

import Box from '@mui/material/Box'
import FormControl from '@mui/material/FormControl'
import FormLabel from '@mui/material/FormLabel'
import FormGroup from '@mui/material/FormGroup'
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'
import Button from '@mui/material/Button'

import useAppSettings from './useAppSettings'

import { AppSettings, SlackChannelSetting } from 'types'
export interface SlackSettingsProps {
    appSettings: AppSettings
}
export const SlackSettings = ({ appSettings }: SlackSettingsProps) => {
    const { isLoading, updateAppSettings } = useAppSettings()
    const [localSettings, setLocalSettings] = useState<AppSettings>(appSettings)
    React.useEffect(() => {
        setLocalSettings(appSettings)
    }, [appSettings])
    const handleSave = () => {
        updateAppSettings(localSettings)
    }

    // const handleSlackProjectsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    //   setLocalSettings((prevSettings) => ({
    //     ...prevSettings,
    //     slackChannels: event.target.value.split(',')
    //   }));
    // };

    const handleEnableChannel = (channel: SlackChannelSetting) => {
        setLocalSettings((prevSettings) => ({
            ...prevSettings,
            slack: {
                ...prevSettings?.slack,
                channels: prevSettings?.slack?.channels?.map((c) => {
                    if (c.id === channel.id) {
                        return {
                            ...c,
                            enabled: !c.enabled
                        }
                    }
                    return c
                })
            }
        }))
    }
    const allToggled = localSettings?.slack?.channels?.every((p) => p.enabled)

    const handleToggleAll = () => {
        setLocalSettings((prevSettings) => ({
            ...prevSettings,
            slack: {
                ...prevSettings?.jira,
                channels: prevSettings?.slack?.channels?.map((p) => ({
                    ...p,
                    enabled: !allToggled
                }))
            }
        }))
    }
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-start',

                gap: 2
            }}
        >
            <a
                href='https://slack.com/oauth/v2/authorize?scope=channels%3Aread%2Cgroups%3Aread%2Cmpim%3Aread%2Cim%3Aread&amp;user_scope=&amp;redirect_uri=https%3A%2F%2Fcf6d-186-50-168-102.ngrok-free.app%2Fapi%2Fauth%2Fcallback%2Fslack&amp;client_id=4817624156983.5081002880582'
                style={{
                    alignItems: 'center',
                    color: '#fff',
                    backgroundColor: '#4A154B',
                    border: '0',
                    borderRadius: '48px',
                    display: 'inline-flex',
                    fontFamily: 'Lato, sans-serif',
                    fontSize: '16px',
                    fontWeight: '600',
                    height: '48px',
                    justifyContent: 'center',
                    textDecoration: 'none',
                    width: '236px'
                }}
            >
                <svg
                    xmlns='http://www.w3.org/2000/svg'
                    style={{ height: '20px', width: '20px', marginRight: '12px' }}
                    viewBox='0 0 122.8 122.8'
                >
                    <path
                        d='M25.8 77.6c0 7.1-5.8 12.9-12.9 12.9S0 84.7 0 77.6s5.8-12.9 12.9-12.9h12.9v12.9zm6.5 0c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9v32.3c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V77.6z'
                        fill='#e01e5a'
                    ></path>
                    <path
                        d='M45.2 25.8c-7.1 0-12.9-5.8-12.9-12.9S38.1 0 45.2 0s12.9 5.8 12.9 12.9v12.9H45.2zm0 6.5c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H12.9C5.8 58.1 0 52.3 0 45.2s5.8-12.9 12.9-12.9h32.3z'
                        fill='#36c5f0'
                    ></path>
                    <path
                        d='M97 45.2c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9-5.8 12.9-12.9 12.9H97V45.2zm-6.5 0c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V12.9C64.7 5.8 70.5 0 77.6 0s12.9 5.8 12.9 12.9v32.3z'
                        fill='#2eb67d'
                    ></path>
                    <path
                        d='M77.6 97c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9-12.9-5.8-12.9-12.9V97h12.9zm0-6.5c-7.1 0-12.9-5.8-12.9-12.9s5.8-12.9 12.9-12.9h32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H77.6z'
                        fill='#ecb22e'
                    ></path>
                </svg>
                Add to Slack
            </a>
            <FormControl sx={{}} component='fieldset' variant='standard'>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <FormLabel component='legend'>
                        <strong>Enabled Channels</strong>
                    </FormLabel>{' '}
                    <Button onClick={handleToggleAll}>
                        {allToggled ? 'Select' : 'Select'} All {localSettings?.slack?.channels?.length}
                    </Button>
                </Box>
                <FormGroup
                    sx={{
                        display: 'flex',
                        flexDirection: 'row'
                    }}
                >
                    {localSettings &&
                        localSettings?.slack?.channels?.map((channel) => (
                            <FormControlLabel
                                key={channel.id}
                                control={
                                    <Checkbox
                                        name={channel.name}
                                        checked={!!channel.enabled}
                                        onChange={() => handleEnableChannel(channel)}
                                    />
                                }
                                label={channel.name}
                            />
                        ))}
                </FormGroup>
                {/* <FormHelperText>Be careful</FormHelperText> */}
            </FormControl>

            <Box sx={{ display: 'flex', justifyContent: 'flex-start', gap: 2, py: 2 }}>
                <Button type='button' color='error' variant='text' onClick={() => setLocalSettings(appSettings)} disabled={isLoading}>
                    Discard
                </Button>
                <Button type='button' variant='contained' onClick={handleSave} disabled={isLoading}>
                    Save
                </Button>
            </Box>
        </Box>
    )
}
export default SlackSettings
