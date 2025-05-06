import dynamic from 'next/dynamic'
import { closeSnackbar as closeSnackbarAction, enqueueSnackbar as enqueueSnackbarAction } from '@/store/actions'
import PropTypes from 'prop-types'
import { useEffect, useRef, useState } from 'react'

// redux
import { useDispatch, useSelector } from 'react-redux'

// hooks
import useNotifier from '@/utils/useNotifier'
import useApi from '@/hooks/useApi'
import { useNavigate } from '@/utils/navigation'
import { useUser } from '@auth0/nextjs-auth0/client'

// project imports
const ProfileAvatar = dynamic(() => import('./ProfileAvatar'), { ssr: false })
const ProfileMenu = dynamic(() => import('./ProfileMenu'), { ssr: false })
const AboutDialog = dynamic(() => import('@/ui-component/dialog/AboutDialog'), { ssr: false })
const ExportDialog = dynamic(() => import('@/ui-component/dialog/ExportDialog'), { ssr: false })

// utils
import { handleFileChange, handleImportSuccess, prepareExportData, processExportedData, showErrorNotification } from '@/utils/profileUtils'

//API
import exportImportApi from '@/api/exportimport'

// styles
import './index.css'

// ==============================|| PROFILE MENU ||============================== //

const ProfileSection = ({ username, handleLogout }) => {
    const { user } = useUser()
    const customization = useSelector((state) => state.customization)

    const [open, setOpen] = useState(false)
    const [aboutDialogOpen, setAboutDialogOpen] = useState(false)
    const [exportDialogOpen, setExportDialogOpen] = useState(false)

    const anchorRef = useRef(null)
    const inputRef = useRef()

    const navigate = useNavigate()
    const importAllApi = useApi(exportImportApi.importData)
    const exportAllApi = useApi(exportImportApi.exportData)
    const prevOpen = useRef(open)

    // ==============================|| Snackbar ||============================== //

    useNotifier()
    const dispatch = useDispatch()
    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const handleClose = (event) => {
        if (anchorRef.current && anchorRef.current.contains(event.target)) {
            return
        }
        setOpen(false)
    }

    const handleToggle = () => {
        setOpen((prevOpen) => !prevOpen)
    }

    const errorFailed = (message) => {
        showErrorNotification(message, enqueueSnackbar, closeSnackbar)
    }

    const fileChange = (e) => {
        handleFileChange(e, importAllApi)
    }

    const importAll = () => {
        inputRef.current.click()
    }

    const onExport = (data) => {
        const body = prepareExportData(data)
        exportAllApi.request(body)
    }

    // Import success effect
    useEffect(() => {
        if (importAllApi.data) {
            handleImportSuccess(dispatch, enqueueSnackbar, closeSnackbar, navigate)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [importAllApi.data])

    // Import error effect
    useEffect(() => {
        if (importAllApi.error) {
            let errMsg = 'Invalid Imported File'
            let error = importAllApi.error
            if (error?.response?.data) {
                errMsg = typeof error.response.data === 'object' ? error.response.data.message : error.response.data
            }
            errorFailed(`Failed to import: ${errMsg}`)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [importAllApi.error])

    // Export success effect
    useEffect(() => {
        if (exportAllApi.data) {
            setExportDialogOpen(false)
            processExportedData(exportAllApi.data, errorFailed)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [exportAllApi.data])

    // Export error effect
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [exportAllApi.error])

    // Open/close effect
    useEffect(() => {
        if (prevOpen.current === true && open === false) {
            anchorRef.current.focus()
        }

        prevOpen.current = open
    }, [open])

    return (
        <>
            <ProfileAvatar ref={anchorRef} handleToggle={handleToggle} />
            <ProfileMenu
                open={open}
                anchorEl={anchorRef.current}
                handleClose={handleClose}
                username={username}
                customization={customization}
                setExportDialogOpen={setExportDialogOpen}
                importAll={importAll}
                setAboutDialogOpen={setAboutDialogOpen}
                handleLogout={handleLogout}
                user={user}
                setOpen={setOpen}
                inputRef={inputRef}
                fileChange={fileChange}
            />
            <input ref={inputRef} type='file' hidden onChange={fileChange} accept='.json' />
            <AboutDialog show={aboutDialogOpen} onCancel={() => setAboutDialogOpen(false)} />
            <ExportDialog show={exportDialogOpen} onCancel={() => setExportDialogOpen(false)} onExport={(data) => onExport(data)} />
        </>
    )
}

ProfileSection.propTypes = {
    username: PropTypes.string,
    handleLogout: PropTypes.func
}

export default ProfileSection
