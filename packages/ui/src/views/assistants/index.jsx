import { useEffect, useState } from 'react'

// material-ui
import { Box, Stack, Button, Skeleton } from '@mui/material'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import ItemCard from '@/ui-component/cards/ItemCard'
import { gridSpacing } from '@/store/constant'
import { StyledButton } from '@/ui-component/button/StyledButton'
import AssistantDialog from './AssistantDialog'
import LoadAssistantDialog from './LoadAssistantDialog'
import AssistantEmptySvg from '@/assets/images/assistant_empty_startai.svg'

// API
import assistantsApi from '@/api/assistants'

// Hooks
import useApi from '@/hooks/useApi'

// icons
import { IconPlus, IconFileUpload } from '@tabler/icons'
import ViewHeader from '@/layout/MainLayout/ViewHeader'
import ErrorBoundary from '@/ErrorBoundary'

// ==============================|| CHATFLOWS ||============================== //

const Assistants = () => {
    const getAllAssistantsApi = useApi(assistantsApi.getAllAssistants)

    const [isLoading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [showDialog, setShowDialog] = useState(false)
    const [dialogProps, setDialogProps] = useState({})
    const [showLoadDialog, setShowLoadDialog] = useState(false)
    const [loadDialogProps, setLoadDialogProps] = useState({})

    const loadExisting = () => {
        const dialogProp = {
            title: 'Загрузить существующий ассистент'
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
            title: 'Создать нового ассистента',
            type: 'ADD',
            cancelButtonName: 'Отмена',
            confirmButtonName: 'Добавить',
            selectedOpenAIAssistantId,
            credential
        }
        setDialogProps(dialogProp)
        setShowDialog(true)
    }

    const edit = (selectedAssistant) => {
        const dialogProp = {
            title: 'Изменить',
            type: 'EDIT',
            cancelButtonName: 'Отмена',
            confirmButtonName: 'Сохранить',
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

    useEffect(() => {
        setLoading(getAllAssistantsApi.loading)
    }, [getAllAssistantsApi.loading])

    useEffect(() => {
        if (getAllAssistantsApi.error) {
            setError(getAllAssistantsApi.error)
        }
    }, [getAllAssistantsApi.error])

    return (
        <>
            <MainCard sx={{ background: customization.isDarkMode ? theme.palette.common.black : '' }}>
                <Stack flexDirection='row'>
                    <Grid sx={{ mb: 1.25 }} container direction='row'>
                        <h1>OpenAI Ассистенты</h1>
                        <Box sx={{ flexGrow: 1 }} />
                        <Grid item>
                            <Button variant='outlined' sx={{ mr: 2 }} onClick={loadExisting} startIcon={<IconFileImport />}>
                                Загрузить
                            </Button>
                            <StyledButton variant='contained' sx={{ color: 'white' }} onClick={addNew} startIcon={<IconPlus />}>
                                Добавить
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
                        <div>Ассистентов еще нет</div>
                    </Stack>
                )}
            </MainCard>
            <LoadAssistantDialog
                show={showLoadDialog}
                dialogProps={loadDialogProps}
                onCancel={() => setShowLoadDialog(false)}
                onAssistantSelected={onAssistantSelected}
                setError={setError}
            ></LoadAssistantDialog>
            <AssistantDialog
                show={showDialog}
                dialogProps={dialogProps}
                onCancel={() => setShowDialog(false)}
                onConfirm={onConfirm}
                setError={setError}
            ></AssistantDialog>
        </>
    )
}

export default Assistants
