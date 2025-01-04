import { useEffect, useState, useRef } from 'react'

// material-ui
import { Box, Stack, Skeleton } from '@mui/material'

// components
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import ItemCard from '@/ui-component/cards/ItemCard'
import { gridSpacing } from '@/store/constant'
import ToolEmptySVG from '@/assets/images/tools_empty.svg'
import ToolDialog from './ToolDialog'
import { ToolsTable } from '@/ui-component/table/ToolsListTable'

// API
import toolsApi from '@/api/tools'

// Hooks
import useApi from '@/hooks/useApi'

// icons
import { IconPlus, IconFileUpload, IconLayoutGrid, IconList } from '@tabler/icons-react'
import ViewHeader from '@/layout/MainLayout/ViewHeader'
import ErrorBoundary from '@/ErrorBoundary'

// ==============================|| CHATFLOWS ||============================== //

const Tools = () => {
    const getAllToolsApi = useApi(toolsApi.getAllTools)

    const [isLoading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [showDialog, setShowDialog] = useState(false)
    const [dialogProps, setDialogProps] = useState({})
    const [view, setView] = useState(localStorage.getItem('toolsDisplayStyle') || 'card')

    const inputRef = useRef(null)

    const handleChange = (nextView) => {
        if (nextView === null) return
        localStorage.setItem('toolsDisplayStyle', nextView)
        setView(nextView)
    }

    const onUploadFile = (file) => {
        try {
            const dialogProp = {
                title: 'Add New Tool',
                type: 'IMPORT',
                cancelButtonName: 'Cancel',
                confirmButtonName: 'Save',
                data: JSON.parse(file)
            }
            setDialogProps(dialogProp)
            setShowDialog(true)
        } catch (e) {
            console.error(e)
        }
    }

    const handleFileUpload = (e) => {
        if (!e.target.files) return

        const file = e.target.files[0]

        const reader = new FileReader()
        reader.onload = (evt) => {
            if (!evt?.target?.result) {
                return
            }
            const { result } = evt.target
            onUploadFile(result)
        }
        reader.readAsText(file)
    }

    const addNew = () => {
        const dialogProp = {
            title: 'Add New Tool',
            type: 'ADD',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Add'
        }
        setDialogProps(dialogProp)
        setShowDialog(true)
    }

    const edit = (selectedTool) => {
        const dialogProp = {
            title: 'Edit Tool',
            type: 'EDIT',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Save',
            data: selectedTool
        }
        setDialogProps(dialogProp)
        setShowDialog(true)
    }

    const onConfirm = () => {
        setShowDialog(false)
        getAllToolsApi.request()
    }

    const [search, setSearch] = useState('')
    const onSearchChange = (event) => {
        setSearch(event.target.value)
    }

    function filterTools(data) {
        return (
            data.name.toLowerCase().indexOf(search.toLowerCase()) > -1 || data.description.toLowerCase().indexOf(search.toLowerCase()) > -1
        )
    }

    useEffect(() => {
        getAllToolsApi.request()

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        setLoading(getAllToolsApi.loading)
    }, [getAllToolsApi.loading])

    useEffect(() => {
        if (getAllToolsApi.error) {
            setError(getAllToolsApi.error)
        }
    }, [getAllToolsApi.error])

    return (
        <>
            <MainCard>
                {error ? (
                    <ErrorBoundary error={error} />
                ) : (
                    <Stack flexDirection='column' sx={{ gap: 3 }}>
                        <ViewHeader onSearchChange={onSearchChange} search={true} searchPlaceholder='Search Tools' title='Tools'>
                            <ToggleGroup
                                type='single'
                                defaultValue='card'
                                className='p-0 gap-0 rounded-md border border-border box-border divide-x divide-border overflow-hidden'
                                onValueChange={handleChange}
                                size='sm'
                                value={view}
                            >
                                <ToggleGroupItem value='card' aria-label='Grid view' className='rounded-none'>
                                    <IconLayoutGrid />
                                </ToggleGroupItem>
                                <ToggleGroupItem value='list' aria-label='List view' className='rounded-none'>
                                    <IconList />
                                </ToggleGroupItem>
                            </ToggleGroup>

                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Button size='sm' variant='outline' onClick={() => inputRef.current.click()}>
                                    <IconFileUpload />
                                    Load
                                </Button>
                                <input
                                    style={{ display: 'none' }}
                                    ref={inputRef}
                                    type='file'
                                    hidden
                                    accept='.json'
                                    onChange={(e) => handleFileUpload(e)}
                                />
                            </Box>
                            <Button onClick={addNew} size='sm'>
                                <IconPlus /> Add New
                            </Button>
                        </ViewHeader>
                        {!view || view === 'card' ? (
                            <>
                                {isLoading ? (
                                    <Box display='grid' gridTemplateColumns='repeat(3, 1fr)' gap={gridSpacing}>
                                        <Skeleton variant='rounded' height={160} />
                                        <Skeleton variant='rounded' height={160} />
                                        <Skeleton variant='rounded' height={160} />
                                    </Box>
                                ) : (
                                    <Box display='grid' gridTemplateColumns='repeat(3, 1fr)' gap={gridSpacing}>
                                        {getAllToolsApi.data &&
                                            getAllToolsApi.data
                                                ?.filter(filterTools)
                                                .map((data, index) => <ItemCard data={data} key={index} onClick={() => edit(data)} />)}
                                    </Box>
                                )}
                            </>
                        ) : (
                            <ToolsTable data={getAllToolsApi.data} isLoading={isLoading} onSelect={edit} />
                        )}
                        {!isLoading && (!getAllToolsApi.data || getAllToolsApi.data.length === 0) && (
                            <Stack sx={{ alignItems: 'center', justifyContent: 'center' }} flexDirection='column'>
                                <Box sx={{ p: 2, height: 'auto' }}>
                                    <img
                                        style={{ objectFit: 'cover', height: '20vh', width: 'auto' }}
                                        src={ToolEmptySVG}
                                        alt='ToolEmptySVG'
                                    />
                                </Box>
                                <div>No Tools Created Yet</div>
                            </Stack>
                        )}
                    </Stack>
                )}
            </MainCard>
            <ToolDialog
                show={showDialog}
                dialogProps={dialogProps}
                onCancel={() => setShowDialog(false)}
                onConfirm={onConfirm}
                setError={setError}
            ></ToolDialog>
        </>
    )
}

export default Tools
