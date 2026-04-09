import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

// material-ui
import { Box, Stack, Skeleton } from '@mui/material'

// project imports
import ViewHeader from '@/layout/MainLayout/ViewHeader'
import MainCard from '@/ui-component/cards/MainCard'
import ItemCard from '@/ui-component/cards/ItemCard'
import { baseURL, gridSpacing } from '@/store/constant'
import AssistantEmptySVG from '@/assets/images/assistant_empty.svg'
import AddCustomAssistantDialog from './AddCustomAssistantDialog'
import ErrorBoundary from '@/ErrorBoundary'
import { StyledPermissionButton } from '@/ui-component/button/RBACButtons'

// API
import assistantsApi from '@/api/assistants'

// Hooks
import useApi from '@/hooks/useApi'

// icons
import { IconPlus } from '@tabler/icons-react'

// i18n
import { useTranslation } from 'react-i18next'

// ==============================|| CustomAssistantLayout ||============================== //

const CustomAssistantLayout = () => {
    const { t } = useTranslation()
    const navigate = useNavigate()

    const getAllAssistantsApi = useApi(assistantsApi.getAllAssistants)

    const [isLoading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [showDialog, setShowDialog] = useState(false)
    const [dialogProps, setDialogProps] = useState({})

    const [search, setSearch] = useState('')
    const onSearchChange = (event) => {
        setSearch(event.target.value)
    }

    const addNew = () => {
        const dialogProp = {
            title: t('assistants.actions.addCustomAssistant'),
            type: 'ADD',
            cancelButtonName: t('assistants.actions.cancel'),
            confirmButtonName: t('assistants.actions.add')
        }
        setDialogProps(dialogProp)
        setShowDialog(true)
    }

    const onConfirm = (assistantId) => {
        setShowDialog(false)
        navigate(`/assistants/custom/${assistantId}`)
    }

    function filterAssistants(data) {
        const parsedData = JSON.parse(data.details)
        return parsedData && parsedData.name && parsedData.name.toLowerCase().indexOf(search.toLowerCase()) > -1
    }

    const getImages = (details) => {
        const images = []
        if (details && details.chatModel && details.chatModel.name) {
            images.push({
                imageSrc: `${baseURL}/api/v1/node-icon/${details.chatModel.name}`
            })
        }
        return images
    }

    useEffect(() => {
        getAllAssistantsApi.request('CUSTOM')

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
            <MainCard>
                {error ? (
                    <ErrorBoundary error={error} />
                ) : (
                    <Stack flexDirection='column' sx={{ gap: 3 }}>
                        <ViewHeader
                            isBackButton={true}
                            onSearchChange={onSearchChange}
                            search={true}
                            searchPlaceholder={t('assistants.cards.customAssistant.searchPlaceholder')}
                            title={t('assistants.cards.customAssistant.title')}
                            description={t('assistants.cards.customAssistant.description')}
                            onBack={() => navigate(-1)}
                        >
                            <StyledPermissionButton
                                permissionId={'assistants:create'}
                                variant='contained'
                                sx={{ borderRadius: 2, height: 40 }}
                                onClick={addNew}
                                startIcon={<IconPlus />}
                            >
                                {t('assistants.actions.add')}
                            </StyledPermissionButton>
                        </ViewHeader>
                        {isLoading ? (
                            <Box display='grid' gridTemplateColumns='repeat(3, 1fr)' gap={gridSpacing}>
                                <Skeleton variant='rounded' height={160} />
                                <Skeleton variant='rounded' height={160} />
                                <Skeleton variant='rounded' height={160} />
                            </Box>
                        ) : (
                            <Box display='grid' gridTemplateColumns='repeat(3, 1fr)' gap={gridSpacing}>
                                {getAllAssistantsApi.data &&
                                    getAllAssistantsApi.data?.filter(filterAssistants).map((data, index) => (
                                        <ItemCard
                                            data={{
                                                name: JSON.parse(data.details)?.name,
                                                description: JSON.parse(data.details)?.instruction
                                            }}
                                            images={getImages(JSON.parse(data.details))}
                                            key={index}
                                            onClick={() => navigate('/assistants/custom/' + data.id)}
                                        />
                                    ))}
                            </Box>
                        )}
                        {!isLoading && (!getAllAssistantsApi.data || getAllAssistantsApi.data.length === 0) && (
                            <Stack sx={{ alignItems: 'center', justifyContent: 'center' }} flexDirection='column'>
                                <Box sx={{ p: 2, height: 'auto' }}>
                                    <img
                                        style={{ objectFit: 'cover', height: '20vh', width: 'auto' }}
                                        src={AssistantEmptySVG}
                                        alt='AssistantEmptySVG'
                                    />
                                </Box>
                                <div>{t('assistants.cards.customAssistant.notFound')}</div>
                            </Stack>
                        )}
                    </Stack>
                )}
            </MainCard>
            <AddCustomAssistantDialog
                show={showDialog}
                dialogProps={dialogProps}
                onCancel={() => setShowDialog(false)}
                onConfirm={onConfirm}
                setError={setError}
            ></AddCustomAssistantDialog>
        </>
    )
}

export default CustomAssistantLayout
