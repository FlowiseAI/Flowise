import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ExecutionDetails } from './ExecutionDetails'
import { omit } from 'lodash'

// API
import executionsApi from '@/api/executions'

// Hooks
import useApi from '@/hooks/useApi'

// MUI
import { Box, Card, Stack, Typography, useTheme, CircularProgress } from '@mui/material'
import { IconCircleXFilled } from '@tabler/icons-react'
import { alpha } from '@mui/material/styles'

// ==============================|| PublicExecutionDetails ||============================== //

const PublicExecutionDetails = () => {
    const { id: executionId } = useParams()
    const theme = useTheme()

    const [execution, setExecution] = useState(null)
    const [selectedMetadata, setSelectedMetadata] = useState({})
    const [isLoading, setLoading] = useState(true)

    const getExecutionByIdPublicApi = useApi(executionsApi.getExecutionByIdPublic)

    useEffect(() => {
        getExecutionByIdPublicApi.request(executionId)

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (getExecutionByIdPublicApi.data) {
            const execution = getExecutionByIdPublicApi.data
            const executionDetails =
                typeof execution.executionData === 'string' ? JSON.parse(execution.executionData) : execution.executionData
            setExecution(executionDetails)
            const newMetadata = {
                ...omit(execution, ['executionData']),
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
                            onRefresh={(executionId) => {
                                getExecutionByIdPublicApi.request(executionId)
                            }}
                        />
                    )}
                </>
            )}
        </>
    )
}

export default PublicExecutionDetails
