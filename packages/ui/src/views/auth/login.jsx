import { useEffect, useState } from 'react'

// material-ui
import { Box } from '@mui/material'
import { BackdropLoader } from '@/ui-component/loading/BackdropLoader'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import LanguageSwitcher from '@/ui-component/language/LanguageSwitcher'

// API
import authApi from '@/api/auth'

// Hooks
import useApi from '@/hooks/useApi'

// ==============================|| ResolveLoginPage ||============================== //

const ResolveLoginPage = () => {
    const resolveLogin = useApi(authApi.resolveLogin)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        setLoading(false)
    }, [resolveLogin.error])

    useEffect(() => {
        resolveLogin.request({})
        setLoading(true)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        setLoading(false)
        if (resolveLogin.data) {
            window.location.href = resolveLogin.data.redirectUrl
        }
    }, [resolveLogin.data])

    return (
        <>
            <MainCard maxWidth='md'>{loading && <BackdropLoader open={loading} />}</MainCard>
            <Box
                sx={{
                    position: 'fixed',
                    right: 24,
                    bottom: 24,
                    zIndex: 1200
                }}
            >
                <LanguageSwitcher />
            </Box>
        </>
    )
}

export default ResolveLoginPage
