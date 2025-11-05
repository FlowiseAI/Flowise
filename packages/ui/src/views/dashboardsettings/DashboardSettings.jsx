import PropTypes from 'prop-types'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
    closeSnackbar as closeSnackbarAction,
    enqueueSnackbar as enqueueSnackbarAction,
    REMOVE_DIRTY
} from '@/store/actions'

// Material-UI components
import {
    Box,
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControlLabel,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Stack,
    Typography
} from '@mui/material'
import { useTheme } from '@mui/material/styles'

// Third-party
import PerfectScrollbar from 'react-perfect-scrollbar'

// Project imports - Assuming these paths are correct in your project
import { PermissionListItemButton } from '@/ui-component/button/RBACButtons'
import MainCard from '@/ui-component/cards/MainCard'
import AboutDialog from '@/ui-component/dialog/AboutDialog'
import ViewHeader from '@/layout/MainLayout/ViewHeader'

// 💥 IMPORTS FOR ORG/WORKSPACE SWITCHING 💥
import OrgWorkspaceBreadcrumbs from '@/views/dashboardsettings/OrgWorkspaceBreadcrumbs'
import WorkspaceSwitcher from '@/views/dashboardsettings/WorkspaceSwitcher'
// ----------------------------------------

// Utility/Hooks
import useNotifier from '@/utils/useNotifier'
import { exportData, stringify } from '@/utils/exportImport'
import useApi from '@/hooks/useApi'
import { useConfig } from '@/store/context/ConfigContext'
import { getErrorMessage } from '@/utils/errorHandler'

// Assets and Icons
import ExportingGIF from '@/assets/images/Exporting.gif'
import {
    IconFileExport,
    IconFileUpload,
    IconInfoCircle,
    IconLogout,
    IconUserEdit,
    IconX,
    IconSparkles
} from '@tabler/icons-react'
import './index.css'
// API
import exportImportApi from '@/api/exportimport'

// Data structures
const dataToExport = [
    'Agentflows',
    'Agentflows V2',
    'Assistants Custom',
    'Assistants OpenAI',
    'Assistants Azure',
    'Chatflows',
    'Chat Messages',
    'Chat Feedbacks',
    'Custom Templates',
    'Document Stores',
    'Executions',
    'Tools',
    'Variables'
]

// ==============================|| ExportDialog Component ||============================== //

const ExportDialog = ({ show, onCancel, onExport }) => {
    const portalElement = document.getElementById('portal') || document.body
    const [selectedData, setSelectedData] = useState(dataToExport)
    const [isExporting, setIsExporting] = useState(false)

    useEffect(() => {
        if (show) setIsExporting(false)
        return () => { setIsExporting(false) }
    }, [show])

    const component = show ? (
        <Dialog
            onClose={!isExporting ? onCancel : undefined}
            open={show}
            fullWidth
            maxWidth='sm'
            aria-labelledby='export-dialog-title'
            aria-describedby='export-dialog-description'
        >
            <DialogTitle sx={{ fontSize: '1rem' }} id='export-dialog-title'>
                {!isExporting ? 'Select Data to Export' : 'Exporting..'}
            </DialogTitle>
            <DialogContent>
                {!isExporting && (
                    <Stack
                        direction='row'
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: 1
                        }}
                    >
                        {dataToExport.map((data, index) => (
                            <FormControlLabel
                                key={index}
                                size='small'
                                control={
                                    <Checkbox
                                        color='success'
                                        checked={selectedData.includes(data)}
                                        onChange={(event) => {
                                            setSelectedData(
                                                event.target.checked
                                                    ? [...selectedData, data]
                                                    : selectedData.filter((item) => item !== data)
                                            )
                                        }}
                                    />
                                }
                                label={data}
                            />
                        ))}
                    </Stack>
                )}
                {isExporting && (
                    <Box sx={{ height: 'auto', display: 'flex', justifyContent: 'center', mb: 3 }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <img
                                style={{
                                    objectFit: 'cover',
                                    height: 'auto',
                                    width: 'auto'
                                }}
                                src={ExportingGIF}
                                alt='ExportingGIF'
                            />
                            <span>Exporting data might take a while</span>
                        </div>
                    </Box>
                )}
            </DialogContent>
            {!isExporting && (
                <DialogActions>
                    <Button onClick={onCancel}>Cancel</Button>
                    <Button
                        disabled={selectedData.length === 0}
                        variant='contained'
                        onClick={() => {
                            setIsExporting(true)
                            onExport(selectedData)
                        }}
                    >
                        Export
                    </Button>
                </DialogActions>
            )}
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}
ExportDialog.propTypes = {
    show: PropTypes.bool,
    onCancel: PropTypes.func,
    onExport: PropTypes.func
}

// ==============================|| ImportDialog Component ||============================== //

const ImportDialog = ({ show }) => {
    const portalElement = document.getElementById('portal') || document.body
    const component = show ? (
        <Dialog open={show} fullWidth maxWidth='sm' aria-labelledby='import-dialog-title' aria-describedby='import-dialog-description'>
            <DialogTitle sx={{ fontSize: '1rem' }} id='import-dialog-title'>
                Importing...
            </DialogTitle>
            <DialogContent>
                <Box sx={{ height: 'auto', display: 'flex', justifyContent: 'center', mb: 3 }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <img
                            style={{
                                objectFit: 'cover',
                                height: 'auto',
                                width: 'auto'
                            }}
                            src={ExportingGIF}
                            alt='ImportingGIF'
                        />
                        <span>Importing data might take a while</span>
                    </div>
                </Box>
            </DialogContent>
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}
ImportDialog.propTypes = {
    show: PropTypes.bool
}

// ==============================|| DASHBOARD SETTINGS PAGE ||============================== //

const DashBoardSettings = ({ handleLogout }) => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)
    const { isCloud, isEnterpriseLicensed } = useConfig() // Fetch isEnterpriseLicensed here

    const [aboutDialogOpen, setAboutDialogOpen] = useState(false)
    const [exportDialogOpen, setExportDialogOpen] = useState(false)
    const [importDialogOpen, setImportDialogOpen] = useState(false)

    const inputRef = useRef()
    const navigate = useNavigate()
    const currentUser = useSelector((state) => state.auth.user)
    const isAuthenticated = useSelector((state) => state.auth.isAuthenticated)

    const importAllApi = useApi(exportImportApi.importData)
    const exportAllApi = useApi(exportImportApi.exportData)

    // ==============================|| Snackbar ||============================== //
    useNotifier()
    const dispatch = useDispatch()
    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const errorFailed = (message) => {
        enqueueSnackbar({
            message: message,
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
    }

    // --- Import Logic ---
    const fileChange = (e) => {
        if (!e.target.files) return

        const file = e.target.files[0]
        setImportDialogOpen(true)

        const reader = new FileReader()
        reader.onload = (evt) => {
            if (!evt?.target?.result) {
                return
            }
            try {
                const body = JSON.parse(evt.target.result)
                importAllApi.request(body)
            } catch (error) {
                setImportDialogOpen(false)
                errorFailed('Failed to read file: Invalid JSON format.')
            }
        }
        reader.readAsText(file)
    }

    const importAllSuccess = () => {
        setImportDialogOpen(false)
        dispatch({ type: REMOVE_DIRTY })
        enqueueSnackbar({
            message: `Import All successful`,
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
    }

    const importAll = () => {
        inputRef.current.click()
    }

    // --- Export Logic ---
    const onExport = (data) => {
        const body = {}
        if (data.includes('Agentflows')) body.agentflow = true
        if (data.includes('Agentflows V2')) body.agentflowv2 = true
        if (data.includes('Assistants Custom')) body.assistantCustom = true
        if (data.includes('Assistants OpenAI')) body.assistantOpenAI = true
        if (data.includes('Assistants Azure')) body.assistantAzure = true
        if (data.includes('Chatflows')) body.chatflow = true
        if (data.includes('Chat Messages')) body.chat_message = true
        if (data.includes('Chat Feedbacks')) body.chat_feedback = true
        if (data.includes('Custom Templates')) body.custom_template = true
        if (data.includes('Document Stores')) body.document_store = true
        if (data.includes('Executions')) body.execution = true
        if (data.includes('Tools')) body.tool = true
        if (data.includes('Variables')) body.variable = true

        exportAllApi.request(body)
    }

    // --- API Effects ---
    useEffect(() => {
        if (importAllApi.data) {
            importAllSuccess()
            navigate(0)
        }
    }, [importAllApi.data])

    useEffect(() => {
        if (importAllApi.error) {
            setImportDialogOpen(false)
            let errMsg = 'Invalid Imported File'
            let error = importAllApi.error
            if (error?.response?.data) {
                errMsg = typeof error.response.data === 'object' ? error.response.data.message : error.response.data
            }
            errorFailed(`Failed to import: ${errMsg}`)
        }
    }, [importAllApi.error])

    useEffect(() => {
        if (exportAllApi.data) {
            setExportDialogOpen(false)
            try {
                const dataStr = stringify(exportData(exportAllApi.data))
                const blob = new Blob([dataStr], { type: 'application/json' })
                const dataUri = URL.createObjectURL(blob)

                const linkElement = document.createElement('a')
                linkElement.setAttribute('href', dataUri)
                linkElement.setAttribute('download', exportAllApi.data.FileDefaultName)
                linkElement.click()
            } catch (error) {
                errorFailed(`Failed to export all: ${getErrorMessage(error)}`)
            }
        }
    }, [exportAllApi.data])

    useEffect(() => {
        if (exportAllApi.error) {
            setExportDialogOpen(false)
            let errMsg = 'Internal Server Error'
            let error = exportAllApi.error
            if (error?.response?.data) {
                errMsg = typeof error.response.data === 'object' ? error.response.data.message : error.response.data
            }
            errorFailed(`Failed to export: ${errMsg}`)
        }
    }, [exportAllApi.error])


    return (
        <>
            <MainCard>
                <Stack flexDirection='column' sx={{ gap: 3 }}>
                    <ViewHeader
                        search={false}
                        title='Settings'
                        description='Manage system-wide configurations and access controls.'
                    />
                    
                    <Box sx={{ p: 2 }}>
                        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                            {/* USER NAME */}
                            {isAuthenticated && currentUser ? (
                                <Typography component='div' variant='h4'>
                                    User : {currentUser.name} -
                                </Typography>
                            ) : (
                                <Typography component='div' variant='h4'>
                                    User : Guest -
                                </Typography>
                            )}

                            {/* ORG/WORKSPACE SWITCHERS (Visible beside the User name) */}
                            {/* Note: Logic determines which switcher to display based on license/cloud status */}
                            <OrgWorkspaceBreadcrumbs />
                            {isEnterpriseLicensed && isAuthenticated && <WorkspaceSwitcher />}
                            {isCloud && isAuthenticated && <OrgWorkspaceBreadcrumbs />}
                            {isCloud && currentUser?.isOrganizationAdmin && (
                            <Button
                                variant='contained'
                                sx={{
                                    mr: 1,
                                    ml: 2,
                                    borderRadius: 15,
                                    background: (theme) =>
                                        `linear-gradient(90deg, ${theme.palette.primary.main} 10%, ${theme.palette.secondary.main} 100%)`,
                                    color: (theme) => theme.palette.secondary.contrastText,
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        background: (theme) =>
                                            `linear-gradient(90deg, ${darken(theme.palette.primary.main, 0.1)} 10%, ${darken(
                                                theme.palette.secondary.main,
                                                0.1
                                            )} 100%)`,
                                        boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
                                    }
                                }}
                                onClick={() => setIsPricingOpen(true)}
                                startIcon={<IconSparkles size={20} />}
                            >
                                Upgrade
                            </Button>
                        )} 
                            
                        </Stack>

                        <Divider />
                        
                        {/* <PerfectScrollbar style={{ maxHeight: 'calc(100vh - 150px)', overflowX: 'hidden' }}> */}
                            <List
                                component='nav'
                                sx={{
                                    width: '100%',
                                    maxWidth: 600,
                                    backgroundColor: 'transparent',
                                    borderRadius: '10px',
                                    '& .MuiListItemButton-root': {
                                        mt: 1,
                                        p: 2,
                                        border: `1px solid ${theme.palette.grey[300]}`
                                    }
                                }}
                            >
                                {/* Export */}
                                <PermissionListItemButton
                                    permissionId='workspace:export'
                                    sx={{ borderRadius: `${customization.borderRadius}px` }}
                                    onClick={() => {
                                        setExportDialogOpen(true)
                                    }}
                                >
                                    <ListItemIcon>
                                        <IconFileExport stroke={1.5} size='1.3rem' />
                                    </ListItemIcon>
                                    <ListItemText primary={<Typography variant='body1' sx={{ fontWeight: 600 }}>Export</Typography>} secondary={<Typography variant='body2' color='#1c1917'>Export all application data to a JSON file.</Typography>} />
                                </PermissionListItemButton>

                                {/* Import */}
                                <PermissionListItemButton
                                    permissionId='workspace:import'
                                    sx={{ borderRadius: `${customization.borderRadius}px` }}
                                    onClick={() => {
                                        importAll()
                                    }}
                                >
                                    <ListItemIcon>
                                        <IconFileUpload stroke={1.5} size='1.3rem' />
                                    </ListItemIcon>
                                    <ListItemText primary={<Typography variant='body1' sx={{ fontWeight: 600 }}>Import</Typography>} secondary={<Typography variant='body2' color='#1c1917'>Import application data from a JSON file.</Typography>} />
                                </PermissionListItemButton>
                                <input ref={inputRef} type='file' hidden onChange={fileChange} accept='.json' />

                                {/* Version */}
                                <ListItemButton
                                    sx={{ borderRadius: `${customization.borderRadius}px` }}
                                    onClick={() => {
                                        setAboutDialogOpen(true)
                                    }}
                                >
                                    <ListItemIcon>
                                        <IconInfoCircle stroke={1.5} size='1.3rem' />
                                    </ListItemIcon>
                                    <ListItemText primary={<Typography variant='body1' sx={{ fontWeight: 600 }}>Version</Typography>} secondary={<Typography variant='body2' color='#1c1917'>View application version and technical details.</Typography>} />
                                </ListItemButton>

                                {/* Users (Conditional) */}
                                {isAuthenticated && !currentUser.isSSO && !isCloud && (
                                    <ListItemButton
                                        sx={{ borderRadius: `${customization.borderRadius}px` }}
                                        onClick={() => {
                                            navigate('/users')
                                        }}
                                    >
                                        <ListItemIcon>
                                            <IconUserEdit stroke={1.5} size='1.3rem' />
                                        </ListItemIcon>
                                        <ListItemText primary={<Typography variant='body1' sx={{ fontWeight: 600 }}>Users</Typography>} secondary={<Typography variant='body2' color='#1c1917'>Manage application user accounts.</Typography>} />
                                    </ListItemButton>
                                )}

                                {/* Roles (Conditional) */}
                                {isAuthenticated && !currentUser.isSSO && !isCloud && (
                                    <ListItemButton
                                        sx={{ borderRadius: `${customization.borderRadius}px` }}
                                        onClick={() => {
                                            navigate('/roles')
                                        }}
                                    >
                                        <ListItemIcon>
                                            <IconUserEdit stroke={1.5} size='1.3rem' />
                                        </ListItemIcon>
                                        <ListItemText primary={<Typography variant='body1' sx={{ fontWeight: 600 }}>Roles</Typography>} secondary={<Typography variant='body2' color='#1c1917'>Configure user roles and permissions (RBAC).</Typography>} />
                                    </ListItemButton>
                                )}

                                {/* Workspaces (Conditional) - Only for self-hosted/Enterprise that don't use the header switchers */}
                                {isAuthenticated && !currentUser.isSSO && !isCloud && !isEnterpriseLicensed && (
                                    <ListItemButton
                                        sx={{ borderRadius: `${customization.borderRadius}px` }}
                                        onClick={() => {
                                            navigate('/workspaces')
                                        }}
                                    >
                                        <ListItemIcon>
                                            <IconUserEdit stroke={1.5} size='1.3rem' />
                                        </ListItemIcon>
                                        <ListItemText primary={<Typography variant='body1' sx={{ fontWeight: 600 }}>Workspaces</Typography>} secondary={<Typography variant='body2' color='#1c1917'>Manage your application workspaces.</Typography>} />
                                    </ListItemButton>
                                )}

                                {/* Update Profile (Conditional) */}
                                {isAuthenticated && !currentUser.isSSO && !isCloud && (
                                    <ListItemButton
                                        sx={{ borderRadius: `${customization.borderRadius}px` }}
                                        onClick={() => {
                                            navigate('/user-profile')
                                        }}
                                    >
                                        <ListItemIcon>
                                            <IconUserEdit stroke={1.5} size='1.3rem' />
                                        </ListItemIcon>
                                        <ListItemText primary={<Typography variant='body1' sx={{ fontWeight: 600 }}>Update Profile</Typography>} secondary={<Typography variant='body2' color='#1c1917'>Change your account information and password.</Typography>} />
                                    </ListItemButton>
                                )}

                                {/* Logout */}
                                <ListItemButton
                                    sx={{ borderRadius: `${customization.borderRadius}px` }}
                                    onClick={() => {
                                        navigate('/signin')
                                    }}
                                >
                                    <ListItemIcon>
                                        <IconLogout stroke={1.5} size='1.3rem' />
                                    </ListItemIcon>
                                    <ListItemText primary={<Typography variant='body1' sx={{ fontWeight: 600 }}>Logout</Typography>} secondary={<Typography variant='body2' color='#1c1917'>Sign out from the application.</Typography>} />
                                </ListItemButton>
                            </List>
                        {/* </PerfectScrollbar> */}
                    </Box>
                </Stack>
            </MainCard>
            
            {/* Dialog Components for specific actions */}
            <AboutDialog show={aboutDialogOpen} onCancel={() => setAboutDialogOpen(false)} />
            <ExportDialog show={exportDialogOpen} onCancel={() => setExportDialogOpen(false)} onExport={(data) => onExport(data)} />
            <ImportDialog show={importDialogOpen} />
        </>
    )
}

DashBoardSettings.propTypes = {
    handleLogout: PropTypes.func
}

export default DashBoardSettings