import { AgentExecutions } from '@flowiseai/agent-executions'
import MainCard from '@/ui-component/cards/MainCard'
import ViewHeader from '@/layout/MainLayout/ViewHeader'
import { useSelector, useDispatch } from 'react-redux'
import { baseURL } from '@/store/constant'
import { enqueueSnackbar as enqueueSnackbarAction } from '@/store/actions'
import { Stack } from '@mui/material'

// ==============================|| AGENT EXECUTIONS ||============================== //

const AgentExecutionsPage = () => {
    const customization = useSelector((state) => state.customization)
    const dispatch = useDispatch()
    return (
        <MainCard>
            <Stack flexDirection='column' sx={{ gap: 3 }}>
                <ViewHeader title='Agent Executions' description='Monitor and manage agentflows executions' />
                <AgentExecutions
                    apiBaseUrl={baseURL}
                    isDarkMode={customization.isDarkMode}
                    permissions={['executions:delete']}
                    onNotification={(msg, variant) => {
                        dispatch(
                            enqueueSnackbarAction({
                                message: msg,
                                options: {
                                    variant,
                                    key: Date.now() + Math.random()
                                }
                            })
                        )
                    }}
                />
            </Stack>
        </MainCard>
    )
}

export default AgentExecutionsPage
