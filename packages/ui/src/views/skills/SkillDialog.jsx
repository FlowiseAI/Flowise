import { createPortal } from 'react-dom'
import PropTypes from 'prop-types'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction } from '@/store/actions'
import { cloneDeep } from 'lodash'

import {
    Box,
    Button,
    Typography,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    OutlinedInput,
    LinearProgress
} from '@mui/material'
import { Grid } from '@/ui-component/grid/Grid'
import { TooltipWithParser } from '@/ui-component/tooltip/TooltipWithParser'
import { GridActionsCellItem } from '@mui/x-data-grid'
import DeleteIcon from '@mui/icons-material/Delete'
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'
import { CodeEditor } from '@/ui-component/editor/CodeEditor'
import { StyledPermissionButton } from '@/ui-component/button/RBACButtons'

// Icons
import { IconX, IconPlus } from '@tabler/icons-react'

// API
import skillsApi from '@/api/skills'

// Hooks
import useConfirm from '@/hooks/useConfirm'
import useApi from '@/hooks/useApi'

// utils
import useNotifier from '@/utils/useNotifier'
import { generateRandomGradient, formatDataGridRows } from '@/utils/genericHelper'
import { HIDE_CANVAS_DIALOG, SHOW_CANVAS_DIALOG } from '@/store/actions'

const SkillDialog = ({ show, dialogProps, onCancel, onConfirm, setError }) => {
    const portalElement = document.getElementById('portal')

    const customization = useSelector((state) => state.customization)
    const dispatch = useDispatch()

    useNotifier()
    const { confirm } = useConfirm()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const getSpecificSkillApi = useApi(skillsApi.getSpecificSkill)

    const [skillId, setSkillId] = useState('')
    const [skillName, setSkillName] = useState('')
    const [skillDesc, setSkillDesc] = useState('')
    const [skillSchema, setSkillSchema] = useState([])
    const [skillMarkdown, setSkillMarkdown] = useState('')

    const deleteItem = useCallback(
        (id) => () => {
            setTimeout(() => {
                setSkillSchema((prevRows) => prevRows.filter((row) => row.id !== id))
            })
        },
        []
    )

    const addNewRow = () => {
        setTimeout(() => {
            setSkillSchema((prevRows) => {
                let allRows = [...cloneDeep(prevRows)]
                const lastRowId = allRows.length ? allRows[allRows.length - 1].id + 1 : 1
                allRows.push({
                    id: lastRowId,
                    property: '',
                    description: '',
                    type: '',
                    required: false
                })
                return allRows
            })
        })
    }

    const onRowUpdate = (newRow) => {
        setTimeout(() => {
            setSkillSchema((prevRows) => {
                let allRows = [...cloneDeep(prevRows)]
                const indexToUpdate = allRows.findIndex((row) => row.id === newRow.id)
                if (indexToUpdate >= 0) {
                    allRows[indexToUpdate] = { ...newRow }
                }
                return allRows
            })
        })
    }

    const columns = useMemo(
        () => [
            { field: 'property', headerName: 'Property', editable: true, flex: 1 },
            {
                field: 'type',
                headerName: 'Type',
                type: 'singleSelect',
                valueOptions: ['string', 'number', 'boolean', 'date'],
                editable: true,
                width: 120
            },
            { field: 'description', headerName: 'Description', editable: true, flex: 1 },
            { field: 'required', headerName: 'Required', type: 'boolean', editable: true, width: 80 },
            {
                field: 'actions',
                type: 'actions',
                width: 80,
                getActions: (params) => [
                    <GridActionsCellItem key={'Delete'} icon={<DeleteIcon />} label='Delete' onClick={deleteItem(params.id)} />
                ]
            }
        ],
        [deleteItem]
    )

    useEffect(() => {
        if (show) dispatch({ type: SHOW_CANVAS_DIALOG })
        else dispatch({ type: HIDE_CANVAS_DIALOG })
        return () => dispatch({ type: HIDE_CANVAS_DIALOG })
    }, [show, dispatch])

    useEffect(() => {
        if (getSpecificSkillApi.data) {
            setSkillId(getSpecificSkillApi.data.id)
            setSkillName(getSpecificSkillApi.data.name)
            setSkillDesc(getSpecificSkillApi.data.description)
            setSkillSchema(formatDataGridRows(getSpecificSkillApi.data.inputSchema))
            setSkillMarkdown(getSpecificSkillApi.data.markdown || '')
        }
    }, [getSpecificSkillApi.data])

    useEffect(() => {
        if (getSpecificSkillApi.error && setError) {
            setError(getSpecificSkillApi.error)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getSpecificSkillApi.error])

    useEffect(() => {
        if (dialogProps.type === 'EDIT' && dialogProps.data) {
            setSkillId(dialogProps.data.id)
            setSkillName(dialogProps.data.name)
            setSkillDesc(dialogProps.data.description)
            setSkillSchema(formatDataGridRows(dialogProps.data.inputSchema))
            setSkillMarkdown(dialogProps.data.markdown || '')
        } else if (dialogProps.type === 'EDIT' && dialogProps.skillId) {
            getSpecificSkillApi.request(dialogProps.skillId)
        } else if (dialogProps.type === 'ADD') {
            setSkillId('')
            setSkillName('')
            setSkillDesc('')
            setSkillSchema([])
            setSkillMarkdown('')
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dialogProps])

    const addNewSkill = async () => {
        try {
            const obj = {
                name: skillName,
                description: skillDesc,
                markdown: skillMarkdown,
                inputSchema: JSON.stringify(skillSchema),
                color: generateRandomGradient()
            }
            const createResp = await skillsApi.createNewSkill(obj)
            if (createResp.data) {
                enqueueSnackbar({
                    message: 'New Skill added',
                    options: {
                        key: new Date().getTime() + Math.random(),
                        variant: 'success',
                        action: (key) => (
                            <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                                <IconX />
                            </Button>
                        )
                    }
                })
                onConfirm(createResp.data.id)
            }
        } catch (error) {
            enqueueSnackbar({
                message: `Failed to add new Skill: ${
                    typeof error.response.data === 'object' ? error.response.data.message : error.response.data
                }`,
                options: {
                    key: new Date().getTime() + Math.random(),
                    variant: 'error',
                    persist: true,
                    action: (key) => (
                        <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                            <IconX />
                        </Button>
                    )
                }
            })
            onCancel()
        }
    }

    const saveSkill = async () => {
        try {
            const saveResp = await skillsApi.updateSkill(skillId, {
                name: skillName,
                description: skillDesc,
                markdown: skillMarkdown,
                inputSchema: JSON.stringify(skillSchema)
            })
            if (saveResp.data) {
                enqueueSnackbar({
                    message: 'Skill saved',
                    options: {
                        key: new Date().getTime() + Math.random(),
                        variant: 'success',
                        action: (key) => (
                            <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                                <IconX />
                            </Button>
                        )
                    }
                })
                onConfirm(saveResp.data.id)
            }
        } catch (error) {
            enqueueSnackbar({
                message: `Failed to save Skill: ${
                    typeof error.response.data === 'object' ? error.response.data.message : error.response.data
                }`,
                options: {
                    key: new Date().getTime() + Math.random(),
                    variant: 'error',
                    persist: true,
                    action: (key) => (
                        <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                            <IconX />
                        </Button>
                    )
                }
            })
            onCancel()
        }
    }

    const deleteSkill = async () => {
        const confirmPayload = {
            title: `Delete Skill`,
            description: `Delete skill ${skillName}?`,
            confirmButtonName: 'Delete',
            cancelButtonName: 'Cancel'
        }
        const isConfirmed = await confirm(confirmPayload)

        if (isConfirmed) {
            try {
                const delResp = await skillsApi.deleteSkill(skillId)
                if (delResp.data) {
                    enqueueSnackbar({
                        message: 'Skill deleted',
                        options: {
                            key: new Date().getTime() + Math.random(),
                            variant: 'success',
                            action: (key) => (
                                <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                                    <IconX />
                                </Button>
                            )
                        }
                    })
                    onConfirm()
                }
            } catch (error) {
                enqueueSnackbar({
                    message: `Failed to delete Skill: ${
                        typeof error.response.data === 'object' ? error.response.data.message : error.response.data
                    }`,
                    options: {
                        key: new Date().getTime() + Math.random(),
                        variant: 'error',
                        persist: true,
                        action: (key) => (
                            <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                                <IconX />
                            </Button>
                        )
                    }
                })
                onCancel()
            }
        }
    }

    const descLength = skillDesc.length

    const component = show ? (
        <Dialog
            fullWidth
            maxWidth='md'
            open={show}
            onClose={onCancel}
            aria-labelledby='skill-dialog-title'
            aria-describedby='skill-dialog-description'
        >
            <DialogTitle sx={{ fontSize: '1rem', p: 3, pb: 0 }} id='skill-dialog-title'>
                {dialogProps.title}
            </DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: '75vh', position: 'relative', px: 3, pb: 3 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
                    <Box>
                        <Stack sx={{ position: 'relative', alignItems: 'center' }} direction='row'>
                            <Typography variant='overline'>
                                Skill Name
                                <span style={{ color: 'red' }}>&nbsp;*</span>
                            </Typography>
                            <TooltipWithParser title={'snake_case identifier used by the LLM to call this skill. Ex: summarize_document'} />
                        </Stack>
                        <OutlinedInput
                            id='skillName'
                            type='string'
                            fullWidth
                            placeholder='my_skill_name'
                            value={skillName}
                            name='skillName'
                            onChange={(e) => setSkillName(e.target.value)}
                        />
                    </Box>
                    <Box>
                        <Stack sx={{ position: 'relative', alignItems: 'center', justifyContent: 'space-between' }} direction='row'>
                            <Stack sx={{ alignItems: 'center' }} direction='row'>
                                <Typography variant='overline'>
                                    Short Description
                                    <span style={{ color: 'red' }}>&nbsp;*</span>
                                </Typography>
                                <TooltipWithParser
                                    title={
                                        'Keep this 10–30 words. This is the ONLY part that costs tokens in the parent agent context window. The full skill body is NOT loaded here.'
                                    }
                                />
                            </Stack>
                            <Typography variant='caption' color={descLength > 150 ? 'error' : 'text.secondary'}>
                                {descLength}/150 chars recommended
                            </Typography>
                        </Stack>
                        {descLength > 0 && (
                            <LinearProgress
                                variant='determinate'
                                value={Math.min((descLength / 150) * 100, 100)}
                                color={descLength > 150 ? 'error' : 'primary'}
                                sx={{ mb: 0.5, borderRadius: 1 }}
                            />
                        )}
                        <OutlinedInput
                            id='skillDesc'
                            type='string'
                            fullWidth
                            placeholder='Summarizes a document into key points'
                            multiline={true}
                            rows={2}
                            value={skillDesc}
                            name='skillDesc'
                            onChange={(e) => setSkillDesc(e.target.value)}
                        />
                    </Box>
                    <Box>
                        <Stack sx={{ position: 'relative', justifyContent: 'space-between' }} direction='row'>
                            <Stack sx={{ position: 'relative', alignItems: 'center' }} direction='row'>
                                <Typography variant='overline'>Input Schema</Typography>
                                <TooltipWithParser title={'Optional structured arguments the LLM passes when calling this skill.'} />
                            </Stack>
                            <Button variant='outlined' onClick={addNewRow} startIcon={<IconPlus />}>
                                Add Item
                            </Button>
                        </Stack>
                        <Grid columns={columns} rows={skillSchema} onRowUpdate={onRowUpdate} />
                    </Box>
                    <Box>
                        <Stack sx={{ position: 'relative', alignItems: 'center' }} direction='row'>
                            <Typography variant='overline'>
                                Skill Body (Markdown)
                                <span style={{ color: 'red' }}>&nbsp;*</span>
                            </Typography>
                            <TooltipWithParser
                                title={
                                    'Full instructions for this skill. Loaded ONLY at execution time as the system prompt of a sub-LLM call — never in the parent agent context window.'
                                }
                            />
                        </Stack>
                        <CodeEditor
                            value={skillMarkdown}
                            theme={customization.isDarkMode ? 'dark' : 'light'}
                            lang={'markdown'}
                            onValueChange={(code) => setSkillMarkdown(code)}
                        />
                    </Box>
                </Box>
            </DialogContent>
            <DialogActions sx={{ p: 3 }}>
                {dialogProps.type === 'EDIT' && (
                    <StyledPermissionButton permissionId={'skills:delete'} color='error' variant='contained' onClick={() => deleteSkill()}>
                        Delete
                    </StyledPermissionButton>
                )}
                <StyledPermissionButton
                    permissionId={'skills:update,skills:create'}
                    disabled={!(skillName && skillDesc && skillMarkdown)}
                    variant='contained'
                    onClick={() => (dialogProps.type === 'ADD' ? addNewSkill() : saveSkill())}
                >
                    {dialogProps.confirmButtonName}
                </StyledPermissionButton>
            </DialogActions>
            <ConfirmDialog />
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

SkillDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func,
    onConfirm: PropTypes.func,
    setError: PropTypes.func
}

export default SkillDialog
