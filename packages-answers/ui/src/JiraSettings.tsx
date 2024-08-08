'use client'
import React, { useState } from 'react'

import Box from '@mui/material/Box'
import FormControl from '@mui/material/FormControl'
import FormLabel from '@mui/material/FormLabel'
import FormGroup from '@mui/material/FormGroup'
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import LinearProgress from '@mui/material/LinearProgress'

import useAppSettings from './useAppSettings'
import AutocompleteSelect from './AutocompleteSelect'

import { AnswersFilters, AppSettings } from 'types'
export interface JiraSettingsProps {
    appSettings: AppSettings
    editable: boolean
}
export const JiraSettings = ({ appSettings, editable }: JiraSettingsProps) => {
    const { isLoading, updateAppSettings } = useAppSettings()
    const [filters, setFilters] = useState<AnswersFilters>(appSettings.filters ?? {})
    const [localSettings, setLocalSettings] = useState<AppSettings>(appSettings)
    React.useEffect(() => {
        setLocalSettings(appSettings)
    }, [appSettings])
    const handleSave = () => {
        updateAppSettings({ ...localSettings, filters })
    }

    const handleEnableProject = (project: { key: string; enabled: boolean }) => {
        setLocalSettings((prevSettings) => ({
            ...prevSettings,
            jira: {
                ...prevSettings?.jira,
                projects: prevSettings?.jira?.projects?.map((p) => {
                    if (p.key === project.key) {
                        return {
                            ...p,
                            enabled: !p.enabled
                        }
                    }
                    return p
                })
            }
        }))
    }

    // return <div>Loading...</div>;

    const allToggled = localSettings?.jira?.projects?.every((p) => p.enabled)

    const handleToggleAll = () => {
        setLocalSettings((prevSettings) => ({
            ...prevSettings,
            jira: {
                ...prevSettings?.jira,
                projects: prevSettings?.jira?.projects?.map((p) => ({
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
            {isLoading ? <LinearProgress variant='query' sx={{ position: 'absolute', bottom: 0, left: 0, width: '100%' }} /> : null}
            <FormControl sx={{}} component='fieldset' variant='standard'>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <FormLabel color='primary' component='legend'>
                        <strong>Enabled Projects</strong>
                    </FormLabel>
                    <Button onClick={handleToggleAll}>
                        {allToggled ? 'Deselect' : 'Select'} All {localSettings?.jira?.projects?.length}
                    </Button>
                </Box>
                <FormGroup
                    sx={{
                        display: 'flex',
                        flexDirection: 'row'
                    }}
                >
                    {localSettings &&
                        localSettings?.jira?.projects?.map((project) => (
                            <FormControlLabel
                                key={project.key}
                                control={
                                    <Checkbox
                                        name={project.key}
                                        checked={!!project.enabled}
                                        onChange={() => handleEnableProject(project)}
                                    />
                                }
                                label={project.key}
                            />
                        ))}
                </FormGroup>
                {/* <FormHelperText>Be careful</FormHelperText> */}
            </FormControl>
            <Typography variant='overline'>Default filters</Typography>

            <AutocompleteSelect
                label='Project'
                options={appSettings?.jira?.projects?.filter((s) => s.enabled)?.map((s) => s.key) || []}
                value={filters?.datasources?.jira?.project || []}
                onChange={(value: string[]) => setFilters({ datasources: { jira: { project: value } } })}
            />
            <AutocompleteSelect
                label={`Status`}
                sx={{ textTransform: 'capitalize' }}
                options={['to do', 'in progress', 'done']}
                value={filters?.datasources?.jira?.status_category || []}
                onChange={(value: string[]) => setFilters({ datasources: { jira: { status_category: value } } })}
            />
            {/* <AutocompleteSelect
        label={`Assignee`}
        sx={{ textTransform: 'capitalize' }}
        options={[
          'adam harris',
          'brad taylor',
          'camilo rios',
          'cecilia widmer',
          'dano alexander',
          'jaime morales',
          'justin whitley',
          'maximiliano techera',
          'tony leung',
          'unassigned'
        ]}
        value={filters?.datasources?.jira?.assignee || []}
        onChange={(value: string[]) => setFilters({ datasources: { jira: { assignee: value } } })}
      /> */}

            {editable ? (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, py: 2 }}>
                    <Button type='button' color='error' variant='text' onClick={() => setLocalSettings(appSettings)} disabled={isLoading}>
                        Discard
                    </Button>
                    <Button type='button' variant='contained' onClick={handleSave} disabled={isLoading}>
                        Save
                    </Button>
                </Box>
            ) : null}
        </Box>
    )
}
export default JiraSettings
