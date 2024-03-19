import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'

// material-ui
import { Grid, Box, Stack, Button } from '@mui/material'
import { useTheme } from '@mui/material/styles'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import ItemCard from '@/ui-component/cards/ItemCard'
import { gridSpacing } from '@/store/constant'
import ToolEmptySVG from '@/assets/images/tools_empty.svg'
import { StyledButton } from '@/ui-component/button/StyledButton'
import AssistantDialog from './AssistantDialog'
import LoadAssistantDialog from './LoadAssistantDialog'

// API
import assistantsApi from '@/api/assistants'

// Hooks
import useApi from '@/hooks/useApi'

// icons
import { IconPlus, IconFileImport } from '@tabler/icons'

// ==============================|| CHATFLOWS ||============================== //

const Assistants = () => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)

    const getAllAssistantsApi = useApi(assistantsApi.getAllAssistants)

    const [showDialog, setShowDialog] = useState(false)
    const [dialogProps, setDialogProps] = useState({})
    const [showLoadDialog, setShowLoadDialog] = useState(false)
    const [loadDialogProps, setLoadDialogProps] = useState({})

    const loadExisting = () => {
        const dialogProp = {
            title: 'Load Existing Assistant'
        }
        setLoadDialogProps(dialogProp)
        setShowLoadDialog(true)
    }

    const onAssistantSelected = (selectedOpenAIAssistantId, credential) => {
        setShowLoadDialog(false)
        addNew(selectedOpenAIAssistantId, credential)
    }

    const addNew = (selectedOpenAIAssistantId, credential) => {
        const dialogProp = {
            title: 'Add New Assistant',
            type: 'ADD',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Add',
            selectedOpenAIAssistantId,
            credential
        }
        setDialogProps(dialogProp)
        setShowDialog(true)
    }

    const edit = (selectedAssistant) => {
        const dialogProp = {
            title: 'Edit Assistant',
            type: 'EDIT',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Save',
            data: selectedAssistant
        }
        setDialogProps(dialogProp)
        setShowDialog(true)
    }

    const onConfirm = () => {
        setShowDialog(false)
        getAllAssistantsApi.request()
    }

    useEffect(() => {
        getAllAssistantsApi.request()

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <>
            <MainCard sx={{ background: customization.isDarkMode ? theme.palette.common.black : '' }}>
                <Stack flexDirection='row'>
                    <Grid sx={{ mb: 1.25 }} container direction='row'>
                        <h1>OpenAI Assistants</h1>
                        <Box sx={{ flexGrow: 1 }} />
                        <Grid item>
                            <Button variant='outlined' sx={{ mr: 2 }} onClick={loadExisting} startIcon={<IconFileImport />}>
                                Load
                            </Button>
                            <StyledButton variant='contained' sx={{ color: 'white' }} onClick={addNew} startIcon={<IconPlus />}>
                                Add
                            </StyledButton>
                        </Grid>
                    </Grid>
                </Stack>
                <Grid container spacing={gridSpacing}>
                    {!getAllAssistantsApi.loading &&
                        getAllAssistantsApi.data &&
                        getAllAssistantsApi.data.map((data, index) => (
                            <Grid key={index} item lg={3} md={4} sm={6} xs={12}>
                                <ItemCard
                                    data={{
                                        name: JSON.parse(data.details)?.name,
                                        description: JSON.parse(data.details)?.instructions,
                                        iconSrc: data.iconSrc
                                    }}
                                    onClick={() => edit(data)}
                                />
                            </Grid>
                        ))}
                </Grid>
                {!getAllAssistantsApi.loading && (!getAllAssistantsApi.data || getAllAssistantsApi.data.length === 0) && (
                    <Stack sx={{ alignItems: 'center', justifyContent: 'center' }} flexDirection='column'>
                        <Box sx={{ p: 2, height: 'auto' }}>
                            <img style={{ objectFit: 'cover', height: '30vh', width: 'auto' }} src={ToolEmptySVG} alt='ToolEmptySVG' />
                        </Box>
                        <div>No Assistants Added Yet</div>
                    </Stack>
                )}
            </MainCard>
            <LoadAssistantDialog
                show={showLoadDialog}
                dialogProps={loadDialogProps}
                onCancel={() => setShowLoadDialog(false)}
                onAssistantSelected={onAssistantSelected}
            ></LoadAssistantDialog>
            <AssistantDialog
                show={showDialog}
                dialogProps={dialogProps}
                onCancel={() => setShowDialog(false)}
                onConfirm={onConfirm}
            ></AssistantDialog>
        </>
    )
}

export default Assistants
