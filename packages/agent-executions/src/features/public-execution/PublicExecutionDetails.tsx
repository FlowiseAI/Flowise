import { useEffect, useState } from 'react'
import { omit } from 'lodash'
import { Box, Card, Stack, Typography, CircularProgress } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useTheme } from '@mui/material/styles'
import { IconCircleXFilled } from '@tabler/icons-react'
import { useApiContext } from '../../infrastructure/store/ApiContext'
import { useApi } from '../../infrastructure/api/hooks'
import { ExecutionDetails } from '../execution-details/ExecutionDetails'
import type { Execution, ExecutionNode, ExecutionMetadata } from '../../types'

interface PublicExecutionDetailsProps {
    executionId: string
}

export const PublicExecutionDetails = ({ executionId }: PublicExecutionDetailsProps) => {
    const theme = useTheme()
    const { executionsApi } = useApiContext()

    const [execution, setExecution] = useState<ExecutionNode[] | null>(null)
    const [selectedMetadata, setSelectedMetadata] = useState<ExecutionMetadata>({} as ExecutionMetadata)
    const [isLoading, setLoading] = useState(true)

    const getExecutionByIdPublicApi = useApi(executionsApi.getExecutionByIdPublic)

    useEffect(() => {
        getExecutionByIdPublicApi.request(executionId)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [executionId])

    useEffect(() => {
        if (getExecutionByIdPublicApi.data) {
            const exec = getExecutionByIdPublicApi.data as Execution
            const executionDetails = typeof exec.executionData === 'string' ? JSON.parse(exec.executionData) : exec.executionData
            setExecution(executionDetails as ExecutionNode[])
            const newMetadata = {
                ...(omit(exec, ['executionData']) as ExecutionMetadata),
                agentflow: {
                    ...selectedMetadata.agentflow
                }
            }
            setSelectedMetadata(newMetadata)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getExecutionByIdPublicApi.data])

    useEffect(() => {
        setLoading(getExecutionByIdPublicApi.loading)
    }, [getExecutionByIdPublicApi.loading])

    return (
        <>
            {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                    <CircularProgress size={60} />
                </Box>
            ) : (
                <>
                    {getExecutionByIdPublicApi.error ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                            <Box sx={{ maxWidth: '500px', width: '100%' }}>
                                <Card
                                    variant='outlined'
                                    sx={{
                                        border: `1px solid ${theme.palette.error.main}`,
                                        borderRadius: 2,
                                        padding: '20px',
                                        boxShadow: `0 4px 8px ${alpha(theme.palette.error.main, 0.15)}`
                                    }}
                                >
                                    <Stack spacing={2} alignItems='center'>
                                        <IconCircleXFilled size={50} color={theme.palette.error.main} />
                                        <Typography variant='h3' color='error.main' align='center'>
                                            Invalid Execution
                                        </Typography>
                                        <Typography variant='body1' color='text.secondary' align='center'>
                                            {`The execution you're looking for doesn't exist or you don't have permission to view it.`}
                                        </Typography>
                                    </Stack>
                                </Card>
                            </Box>
                        </Box>
                    ) : (
                        <ExecutionDetails
                            isPublic={true}
                            execution={execution}
                            metadata={selectedMetadata}
                            onProceedSuccess={() => {
                                getExecutionByIdPublicApi.request(executionId)
                            }}
                            onRefresh={() => {
                                getExecutionByIdPublicApi.request(executionId)
                            }}
                        />
                    )}
                </>
            )}
        </>
    )
}
