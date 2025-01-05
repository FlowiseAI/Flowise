import PropTypes from 'prop-types'
import { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction } from '@/store/actions'

// Material
import { Box, Typography } from '@mui/material'

// components
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

// Project imports
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'
import { File } from '@/ui-component/file/File'

// Icons
import { IconFileUpload, IconX } from '@tabler/icons-react'

// API
import apikeyAPI from '@/api/apikey'

// utils
import useNotifier from '@/utils/useNotifier'

// const
import { HIDE_CANVAS_DIALOG, SHOW_CANVAS_DIALOG } from '@/store/actions'
import { Dropdown } from '@/ui-component/dropdown/Dropdown'

const importModes = [
    {
        label: 'Add & Overwrite',
        name: 'overwriteIfExist',
        description: 'Add keys and overwrite existing keys with the same name'
    },
    {
        label: 'Add & Ignore',
        name: 'ignoreIfExist',
        description: 'Add keys and ignore existing keys with the same name'
    },
    {
        label: 'Add & Verify',
        name: 'errorIfExist',
        description: 'Add Keys and throw error if key with same name exists'
    },
    {
        label: 'Replace All',
        name: 'replaceAll',
        description: 'Replace all keys with the imported keys'
    }
]

const UploadJSONFileDialog = ({ show, dialogProps, onCancel, onConfirm }) => {
    const dispatch = useDispatch()

    // ==============================|| Snackbar ||============================== //

    useNotifier()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [selectedFile, setSelectedFile] = useState()
    const [importMode, setImportMode] = useState('overwrite')

    useEffect(() => {
        return () => {
            setSelectedFile()
        }
    }, [dialogProps])

    useEffect(() => {
        if (show) dispatch({ type: SHOW_CANVAS_DIALOG })
        else dispatch({ type: HIDE_CANVAS_DIALOG })
        return () => dispatch({ type: HIDE_CANVAS_DIALOG })
    }, [show, dispatch])

    const importKeys = async () => {
        try {
            const obj = {
                importMode: importMode,
                jsonFile: selectedFile
            }
            const createResp = await apikeyAPI.importAPI(obj)
            if (createResp.data) {
                enqueueSnackbar({
                    message: 'Imported keys successfully!',
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
                message: `Failed to import keys: ${
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

    return (
        <>
            <Dialog open={show} onClose={onCancel}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className='flex items-center gap-2'>
                            <IconFileUpload />
                            Import API Keys
                        </DialogTitle>
                    </DialogHeader>
                    <Box>
                        <Typography variant='overline'>
                            Import api.json file
                            <span style={{ color: 'red' }}>&nbsp;*</span>
                        </Typography>
                        <File
                            disabled={false}
                            fileType='.json'
                            onChange={(newValue) => setSelectedFile(newValue)}
                            value={selectedFile ?? 'Choose a file to upload'}
                        />
                    </Box>
                    <Box>
                        <Typography variant='overline'>
                            Import Mode
                            <span style={{ color: 'red' }}>&nbsp;*</span>
                        </Typography>
                        <Dropdown
                            key={importMode}
                            name={importMode}
                            options={importModes}
                            onSelect={(newValue) => setImportMode(newValue)}
                            value={importMode ?? 'choose an option'}
                        />
                    </Box>
                    <DialogFooter>
                        <Button onClick={() => onCancel()} size='sm' variant='ghost'>
                            {dialogProps.cancelButtonName}
                        </Button>
                        <Button disabled={!selectedFile} onClick={importKeys} size='sm'>
                            {dialogProps.confirmButtonName}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <ConfirmDialog />
        </>
    )
}

UploadJSONFileDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func,
    onConfirm: PropTypes.func
}

export default UploadJSONFileDialog
