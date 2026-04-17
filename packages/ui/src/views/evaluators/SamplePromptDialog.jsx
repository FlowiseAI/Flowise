import { createPortal } from 'react-dom'
import PropTypes from 'prop-types'
import { useState, useEffect, useMemo } from 'react'

// Material
import { Dialog, DialogActions, DialogContent, DialogTitle, Box, Typography, Divider, Stack, OutlinedInput, Button } from '@mui/material'

// Project imports
import { StyledButton } from '@/ui-component/button/StyledButton'
import { Dropdown } from '@/ui-component/dropdown/Dropdown'
import { TooltipWithParser } from '@/ui-component/tooltip/TooltipWithParser'
import { Grid } from '@/ui-component/grid/Grid'

// Icons
import { IconTestPipe2 } from '@tabler/icons-react'

// utils
import useNotifier from '@/utils/useNotifier'

// const
import { getEvaluationPrompts } from '@/views/evaluators/evaluationPrompts'

// i18n
import { useTranslation } from 'react-i18next'

const SamplePromptDialog = ({ show, dialogProps, onCancel, onConfirm }) => {
    const { t } = useTranslation()
    const portalElement = document.getElementById('portal')
    useNotifier()

    const [selectedPromptName, setSelectedPromptName] = useState('')
    const [selectedConfig, setSelectedConfig] = useState([])
    const [selectedPromptText, setSelectedPromptText] = useState('')

    const evaluationPrompts = useMemo(() => getEvaluationPrompts(t), [t])

    useEffect(() => {
        resetData()
        return () => {
            resetData()
        }
    }, [dialogProps])

    const resetData = () => {
        setSelectedPromptName('')
        setSelectedConfig([])
        setSelectedPromptText('')
    }

    const onSelected = async (selectedPromptName) => {
        if (selectedPromptName) {
            const selected = evaluationPrompts.find((prompt) => prompt.name === selectedPromptName)
            setSelectedConfig(selected.json)
            setSelectedPromptText(selected.prompt)
            setSelectedPromptName(selected.name)
        } else {
            setSelectedPromptName('')
            setSelectedConfig([])
            setSelectedPromptText('')
        }
    }

    const onConfirmPrompt = async () => {
        const selected = evaluationPrompts.find((prompt) => prompt.name === selectedPromptName)
        onConfirm(selected)
    }

    const disableButton = () => {
        return !selectedPromptName || !selectedPromptText
    }

    const columns = useMemo(
        () => [
            { field: 'property', headerName: t('evaluators.columns.property'), flex: 1 },
            {
                field: 'type',
                headerName: t('common.labels.type'),
                type: 'singleSelect',
                valueOptions: ['string', 'number', 'boolean'],
                width: 120
            },
            { field: 'description', headerName: t('common.labels.description'), flex: 1 },
            { field: 'required', headerName: t('evaluators.columns.required'), type: 'boolean', width: 80 },
            {
                field: 'actions',
                type: 'actions',
                width: 80,
                getActions: () => []
            }
        ],
        []
    )

    const component = show ? (
        <Dialog
            fullWidth
            maxWidth='sm'
            open={show}
            onClose={onCancel}
            aria-labelledby='alert-dialog-title'
            aria-describedby='alert-dialog-description'
        >
            <DialogTitle sx={{ fontSize: '1rem' }} id='alert-dialog-title'>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                    <IconTestPipe2 style={{ marginRight: '10px' }} />
                    {t('evaluators.dialogs.samplePrompts')}
                </div>
            </DialogTitle>
            <DialogContent>
                <Stack direction='column' spacing={2}>
                    <Divider />
                    <Box>
                        <Typography variant='overline'>
                            {t('evaluators.inputs.availablePrompts.title')}
                            <span style={{ color: 'red' }}>&nbsp;*</span>
                        </Typography>
                        <Dropdown
                            key={selectedPromptName}
                            name='dataset'
                            defaultOption={t('evaluators.inputs.availablePrompts.placeholder')}
                            options={evaluationPrompts}
                            onSelect={onSelected}
                            value={selectedPromptName}
                        />
                    </Box>
                    {selectedPromptName && (
                        <Box sx={{ pb: 2 }}>
                            <Stack style={{ position: 'relative', justifyContent: 'space-between' }} direction='row'>
                                <Stack style={{ position: 'relative', alignItems: 'center' }} direction='row'>
                                    <Typography variant='overline'>{t('evaluators.outputSchema.title')}</Typography>
                                    <TooltipWithParser title={t('evaluators.outputSchema.tooltip2')} />
                                </Stack>
                            </Stack>
                            <Grid columns={columns} rows={selectedConfig} disabled={'true'} />
                        </Box>
                    )}
                    {selectedPromptName && (
                        <Box sx={{ pb: 2 }}>
                            <div style={{ display: 'flex', flexDirection: 'row' }}>
                                <Typography variant='overline'>{t('common.labels.prompt')}</Typography>
                            </div>
                            <OutlinedInput
                                size='small'
                                multiline={true}
                                type='string'
                                rows={6}
                                fullWidth
                                key='prompt'
                                onChange={(e) => setSelectedPromptText(e.target.value)}
                                value={selectedPromptText}
                            />
                        </Box>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions style={{ marginBottom: 10 }}>
                <Button onClick={() => onCancel()}>{dialogProps.cancelButtonName}</Button>
                <StyledButton
                    disabled={disableButton()}
                    sx={{ mr: 2, borderRadius: 25 }}
                    variant='contained'
                    onClick={() => onConfirmPrompt()}
                >
                    {t('evaluators.actions.selectPrompt')}
                </StyledButton>
            </DialogActions>
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

SamplePromptDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func,
    onConfirm: PropTypes.func
}

export default SamplePromptDialog
