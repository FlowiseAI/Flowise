import { useEffect, useState, useRef } from 'react'

// material-ui
import { Grid, Box, Stack, Button, ButtonGroup } from '@mui/material'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import ItemCard from '@/ui-component/cards/ItemCard'
import { gridSpacing } from '@/store/constant'
import ToolEmptySVG from '@/assets/images/tools_empty.svg'
import { StyledButton } from '@/ui-component/button/StyledButton'
import ToolDialog from './ToolDialog'

// API
import toolsApi from '@/api/tools'

// Hooks
import useApi from '@/hooks/useApi'

// icons
import { IconPlus, IconFileImport } from '@tabler/icons'
import ViewHeader from '@/layout/MainLayout/ViewHeader'

// ==============================|| CHATFLOWS ||============================== //

const Tools = () => {
    const getAllToolsApi = useApi(toolsApi.getAllTools)

    const [showDialog, setShowDialog] = useState(false)
    const [dialogProps, setDialogProps] = useState({})

    const inputRef = useRef(null)

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

    useEffect(() => {
        getAllToolsApi.request()

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <>
            <MainCard>
                <Stack flexDirection='column' sx={{ gap: 3 }}>
                    <ViewHeader title='Tools'>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Button
                                variant='outlined'
                                onClick={() => inputRef.current.click()}
                                startIcon={<IconFileImport />}
                                sx={{ borderRadius: 2, height: 40 }}
                            >
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
                        <ButtonGroup disableElevation aria-label='outlined primary button group'>
                            <StyledButton
                                variant='contained'
                                onClick={addNew}
                                startIcon={<IconPlus />}
                                sx={{ borderRadius: 2, height: 40 }}
                            >
                                Create
                            </StyledButton>
                        </ButtonGroup>
                    </ViewHeader>
                    <Grid container spacing={gridSpacing}>
                        {!getAllToolsApi.loading &&
                            getAllToolsApi.data &&
                            getAllToolsApi.data.map((data, index) => (
                                <Grid key={index} item lg={3} md={4} sm={6} xs={12}>
                                    <ItemCard data={data} onClick={() => edit(data)} />
                                </Grid>
                            ))}
                    </Grid>
                    {!getAllToolsApi.loading && (!getAllToolsApi.data || getAllToolsApi.data.length === 0) && (
                        <Stack sx={{ alignItems: 'center', justifyContent: 'center' }} flexDirection='column'>
                            <Box sx={{ p: 2, height: 'auto' }}>
                                <img style={{ objectFit: 'cover', height: '16vh', width: 'auto' }} src={ToolEmptySVG} alt='ToolEmptySVG' />
                            </Box>
                            <div>No Tools Created Yet</div>
                        </Stack>
                    )}
                </Stack>
            </MainCard>
            <ToolDialog
                show={showDialog}
                dialogProps={dialogProps}
                onCancel={() => setShowDialog(false)}
                onConfirm={onConfirm}
            ></ToolDialog>
        </>
    )
}

export default Tools
