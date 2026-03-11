import { AgentExecutionsProvider, type AgentExecutionsProviderProps } from './AgentExecutionsProvider'
import { ExecutionsList } from './features/executions-list/ExecutionsList'

type AgentExecutionsProps = Omit<AgentExecutionsProviderProps, 'children'>

export const AgentExecutions = (props: AgentExecutionsProps) => {
    return (
        <AgentExecutionsProvider {...props}>
            <ExecutionsList />
        </AgentExecutionsProvider>
    )
}
