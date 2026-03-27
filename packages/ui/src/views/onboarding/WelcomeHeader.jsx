import { Typography, Box } from '@mui/material'

// Welcome page header component
const WelcomeHeader = () => {
    return (
        <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant='h2' component='h1' gutterBottom>
                👋 Welcome to Flowise
            </Typography>
            <Typography variant='h5' color='text.secondary' sx={{ maxWidth: 600, mx: 'auto' }}>
                Build AI flows visually and deploy fast
            </Typography>
            <Typography variant='body1' color='text.secondary' sx={{ mt: 2, maxWidth: 700, mx: 'auto' }}>
                Get started by creating your first chatflow, exploring templates, or building an AI agent. We&apos;ll guide you through each
                step.
            </Typography>
        </Box>
    )
}

export default WelcomeHeader
