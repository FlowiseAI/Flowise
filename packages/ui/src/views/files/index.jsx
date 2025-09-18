import { useEffect, useState } from 'react'

// material-ui
import { Box, Button, Stack } from '@mui/material'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import WorkflowEmptySVG from '@/assets/images/workflow_empty.svg'
import ViewHeader from '@/layout/MainLayout/ViewHeader'
import ErrorBoundary from '@/ErrorBoundary'
import { FilesTable } from '@/ui-component/table/FilesTable'
import useConfirm from '@/hooks/useConfirm'
import useNotifier from '@/utils/useNotifier'
import { closeSnackbar as closeSnackbarAction, enqueueSnackbar as enqueueSnackbarAction } from '@/store/actions'
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'

// API
import filesApi from '@/api/files'

// Hooks
import useApi from '@/hooks/useApi'

// icons
import { IconX } from '@tabler/icons-react'
import { useDispatch } from 'react-redux'
import { useError } from '@/store/context/ErrorContext'

// ==============================|| CHATFLOWS ||============================== //

const Files = () => {
    const { confirm } = useConfirm()

    const [isLoading, setLoading] = useState(true)
    const { error, setError } = useError()
    const [files, setFiles] = useState([])
    const [search, setSearch] = useState('')

    const getAllFilesApi = useApi(filesApi.getAllFiles)

    const dispatch = useDispatch()

    useNotifier()
    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const onSearchChange = (event) => {
        setSearch(event.target.value)
    }

    function filterFiles(data) {
        return (
            data.name.toLowerCase().indexOf(search.toLowerCase()) > -1 ||
            (data.category && data.category.toLowerCase().indexOf(search.toLowerCase()) > -1)
        )
    }

    const handleDeleteFile = async (file) => {
        const confirmPayload = {
            title: `Delete`,
            description: `Delete ${file.name}? This process cannot be undone.`,
            confirmButtonName: 'Delete',
            cancelButtonName: 'Cancel'
        }
        const isConfirmed = await confirm(confirmPayload)

        if (isConfirmed) {
            try {
                const deleteResponse = await filesApi.deleteFile(file.path)
                if (deleteResponse?.data) {
                    enqueueSnackbar({
                        message: 'File deleted',
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
                await getAllFilesApi.request()
            } catch (error) {
                setError(error)
                enqueueSnackbar({
                    message: typeof error.response.data === 'object' ? error.response.data.message : error.response.data,
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
        }
    }

    useEffect(() => {
        getAllFilesApi.request()

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        setLoading(getAllFilesApi.loading)
    }, [getAllFilesApi.loading])

    useEffect(() => {
        if (getAllFilesApi.data) {
            try {
                const files = getAllFilesApi.data
                setFiles(files)
            } catch (e) {
                console.error(e)
            }
        }
    }, [getAllFilesApi.data])

    return (
        <MainCard>
            {error ? (
                <ErrorBoundary error={error} />
            ) : (
                <Stack flexDirection='column' sx={{ gap: 3 }}>
                    <ViewHeader onSearchChange={onSearchChange} search={true} searchPlaceholder='Search File' title='Files' />
                    <FilesTable data={files} filterFunction={filterFiles} handleDelete={handleDeleteFile} isLoading={isLoading} />
                    {!isLoading && (!getAllFilesApi.data || getAllFilesApi.data.length === 0) && (
                        <Stack sx={{ alignItems: 'center', justifyContent: 'center' }} flexDirection='column'>
                            <Box sx={{ p: 2, height: 'auto' }}>
                                <img
                                    style={{ objectFit: 'cover', height: '25vh', width: 'auto' }}
                                    src={WorkflowEmptySVG}
                                    alt='WorkflowEmptySVG'
                                />
                            </Box>
                            <div>No Files Yet</div>
                        </Stack>
                    )}
                </Stack>
            )}

            <ConfirmDialog />
        </MainCard>
    )
}

export default Files
