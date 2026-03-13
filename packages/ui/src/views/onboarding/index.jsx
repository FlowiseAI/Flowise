import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Box, Container, Button, Stack } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import WelcomeHeader from './WelcomeHeader'
import QuickStartGrid from './QuickStartGrid'
import { SKIP_ONBOARDING } from '@/store/actions'

// Main welcome/onboarding page
const WelcomePage = () => {
    const theme = useTheme()
    const dispatch = useDispatch()
    const navigate = useNavigate()

    const handleSkip = async () => {
        dispatch({ type: SKIP_ONBOARDING })
        navigate('/chatflows')
    }

    return (
        <Box
            sx={{
                minHeight: '100vh',
                backgroundColor: theme.palette.background.default,
                pb: 4
            }}
        >
            <Container maxWidth='lg'>
                <Stack spacing={4} sx={{ pt: 8 }}>
                    <WelcomeHeader />

                    <Box>
                        <QuickStartGrid />
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                        <Button variant='text' onClick={handleSkip} sx={{ color: theme.palette.text.secondary }}>
                            Skip → Go to Workspace
                        </Button>
                    </Box>
                </Stack>
            </Container>
        </Box>
    )
}

export default WelcomePage
