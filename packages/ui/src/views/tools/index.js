import { useEffect, useState, useRef } from 'react'
import { useSelector } from 'react-redux'

// material-ui
import { Grid, Box, Stack, Button } from '@mui/material'
import { useTheme } from '@mui/material/styles'

// project imports
import MainCard from 'ui-component/cards/MainCard'
import ItemCard from 'ui-component/cards/ItemCard'
import { gridSpacing } from 'store/constant'
import ToolEmptySVG from 'assets/images/tools_empty.svg'
import { StyledButton } from 'ui-component/button/StyledButton'
import ToolDialog from './ToolDialog'

// API
import toolsApi from 'api/tools'

// Hooks
import useApi from 'hooks/useApi'

// icons
import { IconPlus, IconFileImport } from '@tabler/icons'

// ==============================|| CHATFLOWS ||============================== //

const Tools = () => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)

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
            <MainCard sx={{ background: customization.isDarkMode ? theme.palette.common.black : '' }}>
                <Stack flexDirection='row'>
                    <h1>Tools</h1>
                    <Grid sx={{ mb: 1.25 }} container direction='row'>
                        <Box sx={{ flexGrow: 1 }} />
                        <Grid item>
                            <Button
                                variant='outlined'
                                sx={{ mr: 2 }}
                                onClick={() => inputRef.current.click()}
                                startIcon={<IconFileImport />}
                            >
                                Load
                            </Button>
                            <input ref={inputRef} type='file' hidden accept='.json' onChange={(e) => handleFileUpload(e)} />
                            <StyledButton variant='contained' sx={{ color: 'white' }} onClick={addNew} startIcon={<IconPlus />}>
                                Create
                            </StyledButton>
                        </Grid>
                    </Grid>
                </Stack>
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
                            <img style={{ objectFit: 'cover', height: '30vh', width: 'auto' }} src={ToolEmptySVG} alt='ToolEmptySVG' />
                        </Box>
                        <div>No Tools Created Yet</div>
                    </Stack>
                )}
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
