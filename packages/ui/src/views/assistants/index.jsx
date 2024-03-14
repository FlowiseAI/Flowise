import { useEffect, useState } from 'react'

// material-ui
import { Grid, Box, Stack, Button } from '@mui/material'

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
import ViewHeader from '@/layout/MainLayout/ViewHeader'

// ==============================|| CHATFLOWS ||============================== //

const Assistants = () => {
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
            <MainCard>
                <Stack flexDirection='column' sx={{ gap: 3 }}>
                    <ViewHeader title='OpenAI Assistants'>
                        <Button
                            variant='outlined'
                            onClick={loadExisting}
                            startIcon={<IconFileImport />}
                            sx={{ borderRadius: 2, height: 40 }}
                        >
                            Load
                        </Button>
                        <StyledButton variant='contained' sx={{ borderRadius: 2, height: 40 }} onClick={addNew} startIcon={<IconPlus />}>
                            Add
                        </StyledButton>
                    </ViewHeader>
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
                                <img style={{ objectFit: 'cover', height: '16vh', width: 'auto' }} src={ToolEmptySVG} alt='ToolEmptySVG' />
                            </Box>
                            <div>No Assistants Added Yet</div>
                        </Stack>
                    )}
                </Stack>
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
