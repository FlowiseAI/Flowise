import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import PropTypes from 'prop-types'
import { Stack, Typography, Dialog, DialogContent, DialogTitle, DialogActions, Box } from '@mui/material'
import CredentialInputHandler from '@/views/canvas/CredentialInputHandler'
import { Dropdown } from '@/ui-component/dropdown/Dropdown'
import { StyledButton } from '@/ui-component/button/StyledButton'
import assistantsApi from '@/api/assistants'
import useApi from '@/hooks/useApi'

const LoadAssistantDialog = ({ show, dialogProps, onCancel, onAssistantSelected, setError }) => {
    const portalElement = document.getElementById('portal')

    const getAllAvailableAssistantsApi = useApi(assistantsApi.getAllAvailableAssistants)

    const [credentialId, setCredentialId] = useState('')
    const [availableAssistantsOptions, setAvailableAssistantsOptions] = useState([])
    const [selectedOpenAIAssistantId, setSelectedOpenAIAssistantId] = useState('')

    useEffect(() => {
        return () => {
            setCredentialId('')
            setAvailableAssistantsOptions([])
            setSelectedOpenAIAssistantId('')
        }
    }, [dialogProps])

    useEffect(() => {
        if (getAllAvailableAssistantsApi.data && getAllAvailableAssistantsApi.data.length) {
            const assistants = []
            for (let i = 0; i < getAllAvailableAssistantsApi.data.length; i += 1) {
                assistants.push({
                    label: getAllAvailableAssistantsApi.data[i].name,
                    name: getAllAvailableAssistantsApi.data[i].id,
                    description: getAllAvailableAssistantsApi.data[i].instructions
                })
            }
            setAvailableAssistantsOptions(assistants)
        }
    }, [getAllAvailableAssistantsApi.data])

    useEffect(() => {
        if (getAllAvailableAssistantsApi.error && setError) {
            setError(getAllAvailableAssistantsApi.error)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getAllAvailableAssistantsApi.error])

    const component = show ? (
        <Dialog
            fullWidth
            maxWidth='xs'
            open={show}
            onClose={onCancel}
            aria-labelledby='alert-dialog-title'
            aria-describedby='alert-dialog-description'
        >
            <DialogTitle sx={{ fontSize: '1rem' }} id='alert-dialog-title'>
                {dialogProps.title}
            </DialogTitle>
            <DialogContent>
                <Box sx={{ p: 2 }}>
                    <Stack sx={{ position: 'relative' }} direction='row'>
                        <Typography variant='overline'>
                            OpenAI Credential
                            <span style={{ color: 'red' }}>&nbsp;*</span>
                        </Typography>
                    </Stack>
                    <CredentialInputHandler
                        key={credentialId}
                        data={credentialId ? { credential: credentialId } : {}}
                        inputParam={{
                            label: 'Connect Credential',
                            name: 'credential',
                            type: 'credential',
                            credentialNames: ['openAIApi']
                        }}
                        onSelect={(newValue) => {
                            setCredentialId(newValue)
                            if (newValue) getAllAvailableAssistantsApi.request(newValue)
                        }}
                    />
                </Box>
                {credentialId && (
                    <Box sx={{ p: 2 }}>
                        <Stack sx={{ position: 'relative' }} direction='row'>
                            <Typography variant='overline'>
                                Assistants
                                <span style={{ color: 'red' }}>&nbsp;*</span>
                            </Typography>
                        </Stack>
                        <Dropdown
                            name={selectedOpenAIAssistantId}
                            options={availableAssistantsOptions}
                            onSelect={(newValue) => setSelectedOpenAIAssistantId(newValue)}
                            value={selectedOpenAIAssistantId ?? 'choose an option'}
                        />
                    </Box>
                )}
            </DialogContent>
            {selectedOpenAIAssistantId && (
                <DialogActions>
                    <StyledButton variant='contained' onClick={() => onAssistantSelected(selectedOpenAIAssistantId, credentialId)}>
                        Load
                    </StyledButton>
                </DialogActions>
            )}
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

LoadAssistantDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func,
    onAssistantSelected: PropTypes.func,
    setError: PropTypes.func
}

export default LoadAssistantDialog
