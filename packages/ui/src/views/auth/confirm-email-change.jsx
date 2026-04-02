import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

// material-ui
import { Stack, Typography, Box, useTheme, CircularProgress } from '@mui/material'

// project imports
import MainCard from '@/ui-component/cards/MainCard'

// API
import accountApi from '@/api/account.api'

// Hooks
import useApi from '@/hooks/useApi'

// icons
import { IconCheck, IconX } from '@tabler/icons-react'

const ConfirmEmailChange = () => {
    const confirmApi = useApi(accountApi.confirmEmailChange)

    const [searchParams] = useSearchParams()
    const [loading, setLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const [success, setSuccess] = useState(false)
    const navigate = useNavigate()

    const theme = useTheme()

    useEffect(() => {
        if (confirmApi.data) {
            setLoading(false)
            setErrorMessage('')
            setSuccess(true)
            setTimeout(() => {
                navigate('/signin')
            }, 3000)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [confirmApi.data])

    useEffect(() => {
        if (confirmApi.error) {
            setLoading(false)
            setErrorMessage(confirmApi.error)
            setSuccess(false)
        }
    }, [confirmApi.error])

    useEffect(() => {
        const token = searchParams.get('token')
        if (token) {
            setLoading(true)
            setErrorMessage('')
            setSuccess(false)
            confirmApi.request({ user: { tempToken: token } })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <MainCard>
            <Stack flexDirection='column' sx={{ width: '480px', gap: 3 }}>
                <Stack sx={{ width: '100%', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    <Stack sx={{ alignItems: 'center', gap: 2 }}>
                        {loading && (
                            <>
                                <CircularProgress
                                    sx={{
                                        width: '48px',
                                        height: '48px'
                                    }}
                                />
                                <Typography variant='h1'>Confirming email change...</Typography>
                            </>
                        )}
                        {errorMessage && (
                            <>
                                <Box
                                    sx={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '100%',
                                        backgroundColor: theme.palette.error.main,
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    <IconX />
                                </Box>
                                <Typography variant='h1'>Confirmation failed.</Typography>
                                <Typography variant='body2' color='textSecondary' sx={{ textAlign: 'center' }}>
                                    {errorMessage}
                                </Typography>
                            </>
                        )}
                        {success && (
                            <>
                                <Box
                                    sx={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '100%',
                                        backgroundColor: theme.palette.success.main,
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    <IconCheck />
                                </Box>
                                <Typography variant='h1'>Email updated successfully.</Typography>
                                <Typography variant='body2' color='textSecondary' sx={{ textAlign: 'center' }}>
                                    Please sign in with your new email address.
                                </Typography>
                            </>
                        )}
                    </Stack>
                </Stack>
            </Stack>
        </MainCard>
    )
}

export default ConfirmEmailChange
