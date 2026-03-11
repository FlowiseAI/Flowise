import { Box, Stack } from '@mui/material'
import executionEmptySvg from '../assets/executions_empty.svg'

export const EmptyState = () => {
    return (
        <Stack sx={{ alignItems: 'center', justifyContent: 'center' }} flexDirection='column'>
            <Box sx={{ p: 2, height: 'auto' }}>
                <img style={{ objectFit: 'cover', height: '20vh', width: 'auto' }} src={executionEmptySvg} alt='execution_empty' />
            </Box>
            <div>No Executions Yet</div>
        </Stack>
    )
}
