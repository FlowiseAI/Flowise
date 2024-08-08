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

import useAppSettings from '../useAppSettings'
import AutocompleteSelect from '../AutocompleteSelect'

import { AnswersFilters, AppSettings, ConfluenceSettings as ConfluenceSettingsType, ConfluenceSpaceSetting } from 'types'

export interface ConfluenceSettingsProps {
    appSettings: AppSettings
    editable?: boolean
}
export const ConfluenceSettings = ({ appSettings, editable }: ConfluenceSettingsProps) => {
    const { isLoading, updateAppSettings } = useAppSettings()
    const [filters, setFilters] = useState<AnswersFilters>(appSettings.filters ?? {})
    const [localSettings, setLocalSettings] = useState<ConfluenceSettingsType>(appSettings.confluence!)
    React.useEffect(() => {
        setLocalSettings(appSettings?.confluence!)
    }, [appSettings])
    const handleSave = () => {
        updateAppSettings({ confluence: localSettings, filters })
    }
    const handleDiscard = () => {
        setLocalSettings(appSettings.confluence!)
        setFilters(appSettings.filters ?? {})
    }
    const handleEnableSpace = (space: ConfluenceSpaceSetting) => {
        setLocalSettings((prevSettings) => ({
            ...prevSettings,
            spaces: prevSettings?.spaces?.map((p) => {
                if (p.key === space.key) {
                    return {
                        ...p,
                        enabled: !p.enabled
                    }
                }
                return p
            })
        }))
    }

    const allToggled = localSettings?.spaces?.every((p) => p.enabled)

    const handleToggleAll = () => {
        setLocalSettings((prevSettings) => ({
            ...prevSettings,
            spaces: prevSettings?.spaces?.map((p) => ({
                ...p,
                enabled: !allToggled
            }))
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
                        <strong>Enabled Spaces</strong>
                    </FormLabel>
                    <Button onClick={handleToggleAll}>
                        {allToggled ? 'Deselect' : 'Select'} All {localSettings?.spaces?.length}
                    </Button>
                </Box>
                <FormGroup
                    sx={{
                        display: 'flex',
                        flexDirection: 'row'
                    }}
                >
                    {localSettings?.spaces?.map((space) => (
                        <FormControlLabel
                            key={space.key}
                            control={<Checkbox name={space.key} checked={!!space.enabled} onChange={() => handleEnableSpace(space)} />}
                            label={space.name}
                        />
                    ))}
                </FormGroup>
                {/* <FormHelperText>Be careful</FormHelperText> */}
            </FormControl>
            <Typography variant='overline'>Default filters</Typography>
            <FormControl sx={{}} component='fieldset' variant='standard'>
                {/* <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormLabel color="primary" component="legend">
            <strong>Filters</strong>
          </FormLabel>
          <Button onClick={handleToggleAll}>
            {allToggled ? 'Deselect' : 'Select'} All {localSettings?.spaces?.length}
          </Button>
        </Box> */}
                <AutocompleteSelect
                    label='Confluence Space'
                    options={appSettings?.confluence?.spaces?.filter((s) => s.enabled) || []}
                    getOptionLabel={(option) => {
                        return option?.name
                    }}
                    value={filters?.datasources?.confluence?.spaces ?? []}
                    onChange={(value) =>
                        setFilters({
                            datasources: {
                                confluence: { spaces: value || [] }
                            }
                        })
                    }
                />
                {/* <FormGroup
          sx={{
            display: 'flex',
            flexDirection: 'row'
          }}>
          {localSettings.spaces
            ?.filter((s) => s.enabled)
            ?.map((filter) => (
              <FormControlLabel
                key={filter.key}
                control={
                  <Checkbox
                    name={filter.key}
                    checked={filters?.spaceId?.includes(filter.key) ?? false}
                    onChange={() => handleEnableSpaceFilter(filter)}
                  />
                }
                label={filter.name}
              />
            ))}
        </FormGroup> */}
                {/* <FormHelperText>Be careful</FormHelperText> */}
            </FormControl>
            {/* {editable ? ( */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button type='button' color='error' variant='text' onClick={handleDiscard} disabled={isLoading}>
                    Discard
                </Button>
                <Button type='button' variant='contained' onClick={handleSave} disabled={isLoading}>
                    Save
                </Button>
            </Box>
            {/* ) : null} */}
        </Box>
    )
}
export default ConfluenceSettings
