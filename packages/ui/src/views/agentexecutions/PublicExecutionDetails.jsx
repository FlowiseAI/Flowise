import { PublicExecutionDetails } from '@flowiseai/agent-executions'
import { AgentExecutionsProvider } from '@flowiseai/agent-executions'
import { useParams } from 'react-router-dom'
import { baseURL } from '@/store/constant'

// ==============================|| PUBLIC EXECUTION DETAILS ||============================== //

const PublicExecutionDetailsPage = () => {
    const { id } = useParams()
    return (
        <AgentExecutionsProvider apiBaseUrl={baseURL}>
            <PublicExecutionDetails executionId={id} />
        </AgentExecutionsProvider>
    )
}

export default PublicExecutionDetailsPage
