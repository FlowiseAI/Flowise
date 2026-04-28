import { useState, useEffect, useCallback } from 'react'
import PropTypes from 'prop-types'
import {
    Typography,
    Box,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    ListItem,
    ListItemAvatar,
    ListItemText,
    IconButton,
    OutlinedInput
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'

import CredentialInputHandler from '@/views/canvas/CredentialInputHandler'
import { SwitchInput } from '@/ui-component/switch/Switch'
import { TooltipWithParser } from '@/ui-component/tooltip/TooltipWithParser'
import otelSVG from '@/assets/images/otel.svg'

const CREDENTIAL_INPUT_PARAM = {
    label: 'Connect Credential',
    name: 'credential',
    type: 'credential',
    credentialNames: ['openTelemetryApi']
}

const OtelAnalyticsConfig = ({ analytic, setValue, providerExpanded, onAccordionChange }) => {
    const providerName = 'openTelemetry'
    const otelConfig = analytic[providerName] || {}

    const [spanAttributes, setSpanAttributes] = useState([])

    const configSpanAttributes = otelConfig.spanAttributes
    useEffect(() => {
        if (configSpanAttributes && typeof configSpanAttributes === 'object') {
            const entries = Object.entries(configSpanAttributes)
            setSpanAttributes(entries.map(([key, value]) => ({ key, value })))
        } else {
            setSpanAttributes([])
        }
    }, [configSpanAttributes])

    const handleSpanAttributeChange = useCallback(
        (index, field, newValue) => {
            const updated = [...spanAttributes]
            updated[index] = { ...updated[index], [field]: newValue }
            setSpanAttributes(updated)
            const attrs = {}
            updated.forEach(({ key, value }) => {
                if (key.trim()) attrs[key.trim()] = value
            })
            setValue(attrs, providerName, 'spanAttributes')
        },
        [spanAttributes, setValue, providerName]
    )

    const addSpanAttribute = () => {
        setSpanAttributes([...spanAttributes, { key: '', value: '' }])
    }

    const removeSpanAttribute = (index) => {
        const updated = spanAttributes.filter((_, i) => i !== index)
        setSpanAttributes(updated)
        const attrs = {}
        updated.forEach(({ key, value }) => {
            if (key.trim()) attrs[key.trim()] = value
        })
        setValue(attrs, providerName, 'spanAttributes')
    }

    return (
        <Accordion expanded={providerExpanded[providerName] || false} onChange={onAccordionChange(providerName)} disableGutters>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls={providerName} id={providerName}>
                <ListItem style={{ padding: 0, margin: 0 }} alignItems='center'>
                    <ListItemAvatar>
                        <div
                            style={{
                                width: 50,
                                height: 50,
                                borderRadius: '50%',
                                backgroundColor: 'white'
                            }}
                        >
                            <img
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    padding: 10,
                                    objectFit: 'contain'
                                }}
                                alt='OpenTelemetry'
                                src={otelSVG}
                            />
                        </div>
                    </ListItemAvatar>
                    <ListItemText
                        sx={{ ml: 1 }}
                        primary='OpenTelemetry'
                        secondary={
                            <a target='_blank' rel='noreferrer' href='https://opentelemetry.io'>
                                https://opentelemetry.io
                            </a>
                        }
                    />
                    {otelConfig.status && (
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'row',
                                alignContent: 'center',
                                alignItems: 'center',
                                background: '#d8f3dc',
                                borderRadius: 15,
                                padding: 5,
                                paddingLeft: 7,
                                paddingRight: 7,
                                marginRight: 10
                            }}
                        >
                            <div
                                style={{
                                    width: 15,
                                    height: 15,
                                    borderRadius: '50%',
                                    backgroundColor: '#70e000'
                                }}
                            />
                            <span style={{ color: '#006400', marginLeft: 10 }}>ON</span>
                        </div>
                    )}
                </ListItem>
            </AccordionSummary>
            <AccordionDetails>
                {/* Credential */}
                <Box sx={{ p: 2 }}>
                    <div style={{ display: 'flex', flexDirection: 'row' }}>
                        <Typography>
                            Connect Credential
                            <span style={{ color: 'red' }}>&nbsp;*</span>
                            <TooltipWithParser
                                style={{ marginLeft: 10 }}
                                title='Select or create an OpenTelemetry API credential containing endpoint, protocol, headers, and export settings.'
                            />
                        </Typography>
                    </div>
                    {providerExpanded[providerName] && (
                        <CredentialInputHandler
                            data={otelConfig.credentialId ? { credential: otelConfig.credentialId } : {}}
                            inputParam={CREDENTIAL_INPUT_PARAM}
                            onSelect={(newValue) => setValue(newValue, providerName, 'credentialId')}
                        />
                    )}
                </Box>

                {/* Custom Span Attributes */}
                <Box sx={{ p: 2 }}>
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography>
                            Custom Span Attributes
                            <TooltipWithParser
                                style={{ marginLeft: 10 }}
                                title='Key-value pairs added to root spans. Useful for tagging traces with metadata like team, project, or version.'
                            />
                        </Typography>
                        <IconButton size='small' onClick={addSpanAttribute} color='primary'>
                            <AddIcon />
                        </IconButton>
                    </div>
                    {spanAttributes.map((attr, index) => (
                        <Box key={index} sx={{ display: 'flex', gap: 1, mt: 1, alignItems: 'center' }}>
                            <OutlinedInput
                                size='small'
                                placeholder='Key'
                                value={attr.key}
                                onChange={(e) => handleSpanAttributeChange(index, 'key', e.target.value)}
                                sx={{ flex: 1 }}
                            />
                            <OutlinedInput
                                size='small'
                                placeholder='Value'
                                value={attr.value}
                                onChange={(e) => handleSpanAttributeChange(index, 'value', e.target.value)}
                                sx={{ flex: 1 }}
                            />
                            <IconButton size='small' onClick={() => removeSpanAttribute(index)} color='error'>
                                <DeleteOutlineIcon fontSize='small' />
                            </IconButton>
                        </Box>
                    ))}
                </Box>

                {/* On/Off Toggle */}
                <Box sx={{ p: 2 }}>
                    <div style={{ display: 'flex', flexDirection: 'row' }}>
                        <Typography>On/Off</Typography>
                    </div>
                    <SwitchInput onChange={(newValue) => setValue(newValue, providerName, 'status')} value={otelConfig.status ?? false} />
                </Box>
            </AccordionDetails>
        </Accordion>
    )
}

OtelAnalyticsConfig.propTypes = {
    analytic: PropTypes.object.isRequired,
    setValue: PropTypes.func.isRequired,
    providerExpanded: PropTypes.object.isRequired,
    onAccordionChange: PropTypes.func.isRequired
}

export default OtelAnalyticsConfig
