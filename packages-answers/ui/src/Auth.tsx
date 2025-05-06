'use client'
import { ClientSafeProvider } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'

import { Stack, Card } from '@mui/material'

type AuthFormInputs = {
    email: string
    password: string
}
interface AuthProps {
    providers: Record<string, ClientSafeProvider> | null
}
const Auth = ({ providers }: AuthProps) => {
    // Extract error message from query params
    const error = useSearchParams().get('error')

    return (
        <Container
            sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                overflow: 'auto',
                width: 'auto',
                textAlign: 'center'
            }}
        >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%', maxWidth: 800 }}>
                {error ? (
                    <Stack flexDirection='column' sx={{ alignItems: 'center', gap: 3 }}>
                        <Stack flexDirection='column' sx={{ alignItems: 'center', gap: 1 }}>
                            <Typography variant='h2'>Oh snap!</Typography>
                            <Typography variant='h5'>The following error occured when loading this page.</Typography>
                        </Stack>
                        <Card variant='outlined' sx={{ width: '100%' }}>
                            <Box sx={{ position: 'relative', px: 2, py: 3, width: '100%' }}>
                                <code>{error}</code>
                            </Box>
                        </Card>
                        <Typography variant='body1' sx={{ fontSize: '1.1rem', textAlign: 'center', lineHeight: '1.5' }}>
                            Please retry after some time. If the issue persists, reach out to us at max@theanswer.ai
                        </Typography>
                        <Button variant='contained' type='submit' href='/api/auth/login'>
                            Try again
                        </Button>
                    </Stack>
                ) : null}
            </Box>
        </Container>
    )
}

export default Auth
