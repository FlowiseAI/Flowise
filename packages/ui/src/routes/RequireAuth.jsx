import { useEffect, useState } from 'react'
import { Navigate } from 'react-router'
import PropTypes from 'prop-types'
import { useLocation } from 'react-router-dom'
import { useConfig } from '@/store/context/ConfigContext'
import { useAuth } from '@/hooks/useAuth'
import { useSelector, useDispatch } from 'react-redux'
import useNotifier from '@/utils/useNotifier'

import { enqueueSnackbar as enqueueSnackbarAction } from '@/store/actions'

// material-ui
import { Button, Dialog, DialogContent, Typography, Stack, DialogActions, CircularProgress, Box } from '@mui/material'
import { IconExternalLink, IconCreditCard, IconLogout, IconX } from '@tabler/icons-react'

// API
import accountApi from '@/api/account.api'

// Hooks
import useApi from '@/hooks/useApi'

// store
import { store } from '@/store'
import { logoutSuccess } from '@/store/reducers/authSlice'

/**
 * Checks if a feature flag is enabled
 * @param {Object} features - Feature flags object
 * @param {string} display - Feature flag key to check
 * @param {React.ReactElement} children - Components to render if feature is enabled
 * @returns {React.ReactElement} Children or unauthorized redirect
 */
const checkFeatureFlag = (features, display, children) => {
    // Validate features object exists and is properly formatted
    if (!features || Array.isArray(features) || Object.keys(features).length === 0) {
        return <Navigate to='/unauthorized' replace />
    }

    // Check if feature flag exists and is enabled
    if (Object.hasOwnProperty.call(features, display)) {
        const isFeatureEnabled = features[display] === 'true' || features[display] === true
        return isFeatureEnabled ? children : <Navigate to='/unauthorized' replace />
    }

    return <Navigate to='/unauthorized' replace />
}

export const RequireAuth = ({ permission, display, children }) => {
    const location = useLocation()
    const dispatch = useDispatch()
    const { isCloud, isOpenSource, isEnterpriseLicensed } = useConfig()
    const { hasPermission } = useAuth()
    const isGlobal = useSelector((state) => state.auth.isGlobal)
    const currentUser = useSelector((state) => state.auth.user)
    const features = useSelector((state) => state.auth.features)
    const permissions = useSelector((state) => state.auth.permissions)
    const organization = useSelector((state) => state.auth.organization)
    useNotifier()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))

    const logoutApi = useApi(accountApi.logout)

    const [showOrgPastDueDialog, setShowOrgPastDueDialog] = useState(false)
    const [isBillingLoading, setIsBillingLoading] = useState(false)

    useEffect(() => {
        if (organization && organization.status === 'past_due') {
            setShowOrgPastDueDialog(true)
        }
    }, [organization])

    const handleBillingPortalClick = async () => {
        setIsBillingLoading(true)
        try {
            const resp = await accountApi.getBillingData()
            if (resp.data?.url) {
                window.open(resp.data.url, '_blank')
            }
        } catch (error) {
            enqueueSnackbar({
                message: 'Failed to access billing portal',
                options: {
                    key: new Date().getTime() + Math.random(),
                    variant: 'error'
                }
            })
        } finally {
            setIsBillingLoading(false)
        }
    }

    const handleLogout = () => {
        logoutApi.request()
        enqueueSnackbar({
            message: 'Logging out...',
            options: {
                key: new Date().getTime() + Math.random(),
                variant: 'success',
                action: (key) => (
                    <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                        <IconX />
                    </Button>
                )
            }
        })
    }

    useEffect(() => {
        try {
            if (logoutApi.data && logoutApi.data.message === 'logged_out') {
                store.dispatch(logoutSuccess())
                window.location.href = logoutApi.data.redirectTo
            }
        } catch (e) {
            console.error(e)
        }
    }, [logoutApi.data])

    // Step 1: Authentication Check
    // Redirect to login if user is not authenticated
    if (!currentUser) {
        return <Navigate to='/login' replace state={{ path: location.pathname }} />
    }

    // Step 2: Deployment Type Specific Logic
    // Open Source: Only show features without display property
    if (isOpenSource) {
        return !display ? children : <Navigate to='/unauthorized' replace />
    }

    // Cloud & Enterprise: Check both permissions and feature flags
    if (isCloud || isEnterpriseLicensed) {
        if (isCloud) {
            return (
                <>
                    {children}

                    <Dialog
                        open={showOrgPastDueDialog}
                        disableEscapeKeyDown
                        disableBackdropClick
                        PaperProps={{
                            style: {
                                padding: '20px',
                                minWidth: '500px'
                            }
                        }}
                    >
                        <DialogContent>
                            <Stack spacing={3}>
                                <Stack spacing={1} alignItems='center' textAlign='center'>
                                    <IconCreditCard size={48} color='#f44336' />
                                    <Typography variant='h3' color='error'>
                                        Account Under Suspension
                                    </Typography>
                                </Stack>

                                <Typography variant='body1' color='text.secondary' textAlign='center'>
                                    Your account has been suspended due to a failed payment renewal. To restore access to your account,
                                    please update your payment method and pay any outstanding invoices.
                                </Typography>

                                <Typography variant='body2' color='text.secondary' textAlign='center'>
                                    Click the button below to access your billing portal where you can:
                                </Typography>

                                <Stack spacing={1} sx={{ pl: 2 }}>
                                    <Typography variant='body2' color='text.secondary'>
                                        • Update your payment method
                                    </Typography>
                                    <Typography variant='body2' color='text.secondary'>
                                        • Pay outstanding invoices
                                    </Typography>
                                    <Typography variant='body2' color='text.secondary'>
                                        • View your billing history
                                    </Typography>
                                </Stack>
                            </Stack>
                        </DialogContent>

                        <DialogActions sx={{ p: 3, pt: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Stack sx={{ width: '100%', flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                                <Button
                                    variant='outlined'
                                    color='error'
                                    onClick={handleLogout}
                                    startIcon={<IconLogout />}
                                    fullWidth
                                    sx={{
                                        borderRadius: 2,
                                        height: 48
                                    }}
                                >
                                    Logout
                                </Button>
                                <Button
                                    variant='contained'
                                    color='primary'
                                    onClick={handleBillingPortalClick}
                                    disabled={isBillingLoading}
                                    startIcon={isBillingLoading ? <CircularProgress size={20} /> : <IconExternalLink />}
                                    fullWidth
                                    sx={{
                                        borderRadius: 2,
                                        height: 48
                                    }}
                                >
                                    {isBillingLoading ? 'Opening Billing Portal...' : 'Go to Billing Portal'}
                                </Button>
                            </Stack>
                            <Box sx={{ width: '100%' }}>
                                If you think that this is a bug, please report it to us at{' '}
                                <a href='mailto:support@flowiseai.com' rel='noopener noreferrer' target='_blank'>
                                    support@flowiseai.com
                                </a>
                            </Box>
                        </DialogActions>
                    </Dialog>
                </>
            )
        }

        // Allow access to basic features (no display property)
        if (!display) return children

        // Check if user has any permissions
        if (permissions.length === 0) {
            return <Navigate to='/unauthorized' replace state={{ path: location.pathname }} />
        }

        // Organization admins bypass permission checks
        if (isGlobal) {
            return checkFeatureFlag(features, display, children)
        }

        // Check user permissions and feature flags
        if (!permission || hasPermission(permission)) {
            return checkFeatureFlag(features, display, children)
        }

        return <Navigate to='/unauthorized' replace />
    }

    // Fallback: Allow access if none of the above conditions match
    return children
}

RequireAuth.propTypes = {
    permission: PropTypes.string,
    display: PropTypes.string,
    children: PropTypes.element
}
