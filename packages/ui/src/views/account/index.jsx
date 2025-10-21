import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'

// utils
import useNotifier from '@/utils/useNotifier'
import { validatePassword } from '@/utils/validation'

// material-ui
import {
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    LinearProgress,
    OutlinedInput,
    Skeleton,
    Stack,
    TextField,
    Typography
} from '@mui/material'
import { darken, useTheme } from '@mui/material/styles'

// project imports
import ErrorBoundary from '@/ErrorBoundary'
import ViewHeader from '@/layout/MainLayout/ViewHeader'
import { StyledButton } from '@/ui-component/button/StyledButton'
import MainCard from '@/ui-component/cards/MainCard'
import SettingsSection from '@/ui-component/form/settings'
import PricingDialog from '@/ui-component/subscription/PricingDialog'

// Icons
import { IconAlertCircle, IconCreditCard, IconExternalLink, IconSparkles, IconX } from '@tabler/icons-react'

// API
import accountApi from '@/api/account.api'
import pricingApi from '@/api/pricing'
import userApi from '@/api/user'

// Hooks
import useApi from '@/hooks/useApi'

// Store
import { store } from '@/store'
import { closeSnackbar as closeSnackbarAction, enqueueSnackbar as enqueueSnackbarAction } from '@/store/actions'
import { gridSpacing } from '@/store/constant'
import { useConfig } from '@/store/context/ConfigContext'
import { useError } from '@/store/context/ErrorContext'
import { userProfileUpdated } from '@/store/reducers/authSlice'

// ==============================|| ACCOUNT SETTINGS ||============================== //

const calculatePercentage = (count, total) => {
    return Math.min((count / total) * 100, 100)
}

const AccountSettings = () => {
    const theme = useTheme()
    const dispatch = useDispatch()
    useNotifier()
    const navigate = useNavigate()

    const currentUser = useSelector((state) => state.auth.user)
    const customization = useSelector((state) => state.customization)

    const { error, setError } = useError()
    const { isCloud } = useConfig()

    const [isLoading, setLoading] = useState(true)
    const [profileName, setProfileName] = useState('')
    const [email, setEmail] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [usage, setUsage] = useState(null)
    const [isBillingLoading, setIsBillingLoading] = useState(false)
    const [seatsQuantity, setSeatsQuantity] = useState(0)
    const [prorationInfo, setProrationInfo] = useState(null)
    const [isUpdatingSeats, setIsUpdatingSeats] = useState(false)
    const [openPricingDialog, setOpenPricingDialog] = useState(false)
    const [openRemoveSeatsDialog, setOpenRemoveSeatsDialog] = useState(false)
    const [openAddSeatsDialog, setOpenAddSeatsDialog] = useState(false)
    const [includedSeats, setIncludedSeats] = useState(0)
    const [purchasedSeats, setPurchasedSeats] = useState(0)
    const [occupiedSeats, setOccupiedSeats] = useState(0)
    const [totalSeats, setTotalSeats] = useState(0)

    const predictionsUsageInPercent = useMemo(() => {
        return usage ? calculatePercentage(usage.predictions?.usage, usage.predictions?.limit) : 0
    }, [usage])
    const storageUsageInPercent = useMemo(() => {
        return usage ? calculatePercentage(usage.storage?.usage, usage.storage?.limit) : 0
    }, [usage])

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const getUserByIdApi = useApi(userApi.getUserById)
    const getPricingPlansApi = useApi(pricingApi.getPricingPlans)
    const getAdditionalSeatsQuantityApi = useApi(userApi.getAdditionalSeatsQuantity)
    const getAdditionalSeatsProrationApi = useApi(userApi.getAdditionalSeatsProration)
    const getCustomerDefaultSourceApi = useApi(userApi.getCustomerDefaultSource)
    const updateAdditionalSeatsApi = useApi(userApi.updateAdditionalSeats)
    const getCurrentUsageApi = useApi(userApi.getCurrentUsage)

    useEffect(() => {
        if (isCloud) {
            getUserByIdApi.request(currentUser.id)
            getPricingPlansApi.request()
            getAdditionalSeatsQuantityApi.request(currentUser?.activeOrganizationSubscriptionId)
            getCurrentUsageApi.request()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isCloud])

    useEffect(() => {
        setLoading(getUserByIdApi.loading)
    }, [getUserByIdApi.loading])

    useEffect(() => {
        try {
            if (getUserByIdApi.data) {
                setProfileName(getUserByIdApi.data?.name || '')
                setEmail(getUserByIdApi.data?.email || '')
            }
        } catch (e) {
            console.error(e)
        }
    }, [getUserByIdApi.data])

    useEffect(() => {
        if (getCurrentUsageApi.data) {
            setUsage(getCurrentUsageApi.data)
        }
    }, [getCurrentUsageApi.data])

    useEffect(() => {
        if (openRemoveSeatsDialog || openAddSeatsDialog) {
            setSeatsQuantity(0)
            getCustomerDefaultSourceApi.request(currentUser?.activeOrganizationCustomerId)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [openRemoveSeatsDialog, openAddSeatsDialog])

    useEffect(() => {
        if (getAdditionalSeatsProrationApi.data) {
            setProrationInfo(getAdditionalSeatsProrationApi.data)
        }
    }, [getAdditionalSeatsProrationApi.data])

    useEffect(() => {
        if (!getAdditionalSeatsQuantityApi.loading && getAdditionalSeatsQuantityApi.data) {
            const included = getAdditionalSeatsQuantityApi.data?.includedSeats || 1
            const purchased = getAdditionalSeatsQuantityApi.data?.quantity || 0
            const occupied = getAdditionalSeatsQuantityApi.data?.totalOrgUsers || 1

            setIncludedSeats(included)
            setPurchasedSeats(purchased)
            setOccupiedSeats(occupied)
            setTotalSeats(included + purchased)
        }
    }, [getAdditionalSeatsQuantityApi.data, getAdditionalSeatsQuantityApi.loading])

    const currentPlanTitle = useMemo(() => {
        if (!getPricingPlansApi.data) return ''
        const currentPlan = getPricingPlansApi.data.find((plan) => plan.prodId === currentUser?.activeOrganizationProductId)
        return currentPlan?.title || ''
    }, [getPricingPlansApi.data, currentUser?.activeOrganizationProductId])

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
                    variant: 'error',
                    action: (key) => (
                        <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                            <IconX />
                        </Button>
                    )
                }
            })
        } finally {
            setIsBillingLoading(false)
        }
    }

    const saveProfileData = async () => {
        try {
            const obj = {
                id: currentUser.id,
                name: profileName,
                email: email
            }
            const saveProfileResp = await userApi.updateUser(obj)
            if (saveProfileResp.data) {
                store.dispatch(userProfileUpdated(saveProfileResp.data))
                enqueueSnackbar({
                    message: 'Profile updated',
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
        } catch (error) {
            setError(error)
            enqueueSnackbar({
                message: `Failed to update profile: ${
                    typeof error.response.data === 'object' ? error.response.data.message : error.response.data
                }`,
                options: {
                    key: new Date().getTime() + Math.random(),
                    variant: 'error',
                    persist: true,
                    action: (key) => (
                        <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                            <IconX />
                        </Button>
                    )
                }
            })
        }
    }

    const savePassword = async () => {
        try {
            const validationErrors = []
            if (newPassword !== confirmPassword) {
                validationErrors.push('New Password and Confirm Password do not match')
            }
            const passwordErrors = validatePassword(newPassword)
            if (passwordErrors.length > 0) {
                validationErrors.push(...passwordErrors)
            }
            if (validationErrors.length > 0) {
                enqueueSnackbar({
                    message: validationErrors.join(', '),
                    options: {
                        key: new Date().getTime() + Math.random(),
                        variant: 'error',
                        persist: true,
                        action: (key) => (
                            <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                                <IconX />
                            </Button>
                        )
                    }
                })
                return
            }

            const obj = {
                id: currentUser.id,
                password: newPassword
            }
            const saveProfileResp = await userApi.updateUser(obj)
            if (saveProfileResp.data) {
                store.dispatch(userProfileUpdated(saveProfileResp.data))
                enqueueSnackbar({
                    message: 'Password updated',
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
        } catch (error) {
            setError(error)
            enqueueSnackbar({
                message: `Failed to update password: ${
                    typeof error.response.data === 'object' ? error.response.data.message : error.response.data
                }`,
                options: {
                    key: new Date().getTime() + Math.random(),
                    variant: 'error',
                    persist: true,
                    action: (key) => (
                        <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                            <IconX />
                        </Button>
                    )
                }
            })
        }
    }

    const handleSeatsModification = async (newSeatsAmount) => {
        try {
            setIsUpdatingSeats(true)

            if (!prorationInfo?.prorationDate) {
                throw new Error('No proration date available')
            }

            await updateAdditionalSeatsApi.request(
                currentUser?.activeOrganizationSubscriptionId,
                newSeatsAmount,
                prorationInfo.prorationDate
            )
            enqueueSnackbar({
                message: 'Seats updated successfully',
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
            // Refresh the seats quantity display
            getAdditionalSeatsQuantityApi.request(currentUser?.activeOrganizationSubscriptionId)
        } catch (error) {
            console.error('Error updating seats:', error)
            enqueueSnackbar({
                message: `Failed to update seats: ${
                    typeof error.response.data === 'object' ? error.response.data.message : error.response.data
                }`,
                options: {
                    key: new Date().getTime() + Math.random(),
                    variant: 'error',
                    persist: true,
                    action: (key) => (
                        <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                            <IconX />
                        </Button>
                    )
                }
            })
        } finally {
            setIsUpdatingSeats(false)
            setProrationInfo(null)
            setOpenAddSeatsDialog(false)
            setOpenRemoveSeatsDialog(false)
            setSeatsQuantity(0)
        }
    }

    const handleQuantityChange = (value, operation) => {
        setSeatsQuantity(value)
        // Calculate proration for the new quantity
        const totalAdditionalSeats = operation === 'add' ? purchasedSeats + value : purchasedSeats - value
        if (currentUser?.activeOrganizationSubscriptionId) {
            getAdditionalSeatsProrationApi.request(currentUser.activeOrganizationSubscriptionId, totalAdditionalSeats)
        }
    }

    const handleRemoveSeatsDialogClose = () => {
        if (!isUpdatingSeats) {
            setProrationInfo(null)
            setOpenRemoveSeatsDialog(false)
            setSeatsQuantity(0)
        }
    }

    const handleAddSeatsDialogClose = () => {
        if (!isUpdatingSeats) {
            setProrationInfo(null)
            setOpenAddSeatsDialog(false)
            setSeatsQuantity(0)
        }
    }

    // Calculate empty seats
    const emptySeats = Math.min(purchasedSeats, totalSeats - occupiedSeats)

    return (
        <MainCard maxWidth='md'>
            {error ? (
                <ErrorBoundary error={error} />
            ) : (
                <Stack flexDirection='column' sx={{ gap: 4 }}>
                    <ViewHeader title='Account Settings' />
                    {isLoading && !getUserByIdApi.data ? (
                        <Box display='flex' flexDirection='column' gap={gridSpacing}>
                            <Skeleton width='25%' height={32} />
                            <Box display='flex' flexDirection='column' gap={2}>
                                <Skeleton width='20%' />
                                <Skeleton variant='rounded' height={56} />
                            </Box>
                            <Box display='flex' flexDirection='column' gap={2}>
                                <Skeleton width='20%' />
                                <Skeleton variant='rounded' height={56} />
                            </Box>
                            <Box display='flex' flexDirection='column' gap={2}>
                                <Skeleton width='20%' />
                                <Skeleton variant='rounded' height={56} />
                            </Box>
                        </Box>
                    ) : (
                        <>
                            <SettingsSection title='Subscription & Billing'>
                                <Box
                                    sx={{
                                        width: '100%',
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(3, 1fr)'
                                    }}
                                >
                                    <Box
                                        sx={{
                                            gridColumn: 'span 2 / span 2',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'start',
                                            justifyContent: 'center',
                                            gap: 1,
                                            px: 2.5,
                                            py: 2
                                        }}
                                    >
                                        {currentPlanTitle && (
                                            <Stack sx={{ alignItems: 'center' }} flexDirection='row'>
                                                <Typography variant='body2'>Current Organization Plan:</Typography>
                                                <Typography sx={{ ml: 1, color: theme.palette.success.dark }} variant='h3'>
                                                    {currentPlanTitle.toUpperCase()}
                                                </Typography>
                                            </Stack>
                                        )}
                                        <Typography
                                            sx={{ opacity: customization.isDarkMode ? 0.7 : 1 }}
                                            variant='body2'
                                            color='text.secondary'
                                        >
                                            Update your billing details and subscription
                                        </Typography>
                                    </Box>
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'end',
                                            px: 2.5,
                                            py: 2,
                                            gap: 2
                                        }}
                                    >
                                        <Button
                                            variant='outlined'
                                            endIcon={!isBillingLoading && <IconExternalLink />}
                                            disabled={!currentUser.isOrganizationAdmin || isBillingLoading}
                                            onClick={handleBillingPortalClick}
                                            sx={{ borderRadius: 2, height: 40 }}
                                        >
                                            {isBillingLoading ? (
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <CircularProgress size={16} color='inherit' />
                                                    Loading
                                                </Box>
                                            ) : (
                                                'Billing'
                                            )}
                                        </Button>
                                        <Button
                                            variant='contained'
                                            sx={{
                                                mr: 1,
                                                ml: 2,
                                                minWidth: 160,
                                                height: 40,
                                                borderRadius: 15,
                                                background: (theme) =>
                                                    `linear-gradient(90deg, ${theme.palette.primary.main} 10%, ${theme.palette.secondary.main} 100%)`,
                                                color: (theme) => theme.palette.secondary.contrastText,
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                                transition: 'all 0.3s ease',
                                                '&:hover': {
                                                    background: (theme) =>
                                                        `linear-gradient(90deg, ${darken(theme.palette.primary.main, 0.1)} 10%, ${darken(
                                                            theme.palette.secondary.main,
                                                            0.1
                                                        )} 100%)`,
                                                    boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
                                                }
                                            }}
                                            endIcon={<IconSparkles />}
                                            disabled={!currentUser.isOrganizationAdmin}
                                            onClick={() => setOpenPricingDialog(true)}
                                        >
                                            Change Plan
                                        </Button>
                                    </Box>
                                </Box>
                            </SettingsSection>
                            <SettingsSection title='Seats'>
                                <Box
                                    sx={{
                                        width: '100%',
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(3, 1fr)'
                                    }}
                                >
                                    <Box
                                        sx={{
                                            gridColumn: 'span 2 / span 2',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'start',
                                            justifyContent: 'center',
                                            gap: 1,
                                            px: 2.5,
                                            py: 2
                                        }}
                                    >
                                        <Stack sx={{ alignItems: 'center' }} flexDirection='row'>
                                            <Typography variant='body2'>Seats Included in Plan:</Typography>
                                            <Typography sx={{ ml: 1, color: 'inherit' }} variant='h3'>
                                                {getAdditionalSeatsQuantityApi.loading ? <CircularProgress size={16} /> : includedSeats}
                                            </Typography>
                                        </Stack>
                                        <Stack sx={{ alignItems: 'center' }} flexDirection='row'>
                                            <Typography variant='body2'>Additional Seats Purchased:</Typography>
                                            <Typography sx={{ ml: 1, color: theme.palette.success.dark }} variant='h3'>
                                                {getAdditionalSeatsQuantityApi.loading ? <CircularProgress size={16} /> : purchasedSeats}
                                            </Typography>
                                        </Stack>
                                        <Stack sx={{ alignItems: 'center' }} flexDirection='row'>
                                            <Typography variant='body2'>Occupied Seats:</Typography>
                                            <Typography sx={{ ml: 1, color: 'inherit' }} variant='h3'>
                                                {getAdditionalSeatsQuantityApi.loading ? (
                                                    <CircularProgress size={16} />
                                                ) : (
                                                    `${occupiedSeats}/${totalSeats}`
                                                )}
                                            </Typography>
                                        </Stack>
                                    </Box>
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'end',
                                            gap: 2,
                                            px: 2.5,
                                            py: 2
                                        }}
                                    >
                                        {getAdditionalSeatsQuantityApi.data?.quantity > 0 && currentPlanTitle.toUpperCase() === 'PRO' && (
                                            <Button
                                                variant='outlined'
                                                disabled={!currentUser.isOrganizationAdmin || !getAdditionalSeatsQuantityApi.data?.quantity}
                                                onClick={() => {
                                                    setOpenRemoveSeatsDialog(true)
                                                }}
                                                color='error'
                                                sx={{ borderRadius: 2, height: 40 }}
                                            >
                                                Remove Seats
                                            </Button>
                                        )}
                                        <StyledButton
                                            variant='contained'
                                            disabled={!currentUser.isOrganizationAdmin}
                                            onClick={() => {
                                                if (currentPlanTitle.toUpperCase() === 'PRO') {
                                                    setOpenAddSeatsDialog(true)
                                                } else {
                                                    setOpenPricingDialog(true)
                                                }
                                            }}
                                            title='Add Seats is available only for PRO plan'
                                            sx={{ borderRadius: 2, height: 40 }}
                                        >
                                            Add Seats
                                        </StyledButton>
                                    </Box>
                                </Box>
                            </SettingsSection>
                            <SettingsSection title='Usage'>
                                <Box
                                    sx={{
                                        width: '100%',
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(2, 1fr)'
                                    }}
                                >
                                    <Box sx={{ p: 2.5, borderRight: 1, borderColor: theme.palette.grey[900] + 25 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <Typography variant='h3'>Predictions</Typography>
                                            <Typography variant='body2' color='text.secondary'>
                                                {`${usage?.predictions?.usage || 0} / ${usage?.predictions?.limit || 0}`}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                                            <Box sx={{ width: '100%', mr: 1 }}>
                                                <LinearProgress
                                                    sx={{
                                                        height: 10,
                                                        borderRadius: 5,
                                                        '& .MuiLinearProgress-bar': {
                                                            backgroundColor: (theme) => {
                                                                if (predictionsUsageInPercent > 90) return theme.palette.error.main
                                                                if (predictionsUsageInPercent > 75) return theme.palette.warning.main
                                                                if (predictionsUsageInPercent > 50) return theme.palette.success.light
                                                                return theme.palette.success.main
                                                            }
                                                        }
                                                    }}
                                                    value={predictionsUsageInPercent > 100 ? 100 : predictionsUsageInPercent}
                                                    variant='determinate'
                                                />
                                            </Box>
                                            <Typography variant='body2' color='text.secondary'>{`${predictionsUsageInPercent.toFixed(
                                                2
                                            )}%`}</Typography>
                                        </Box>
                                    </Box>
                                    <Box sx={{ p: 2.5 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <Typography variant='h3'>Storage</Typography>
                                            <Typography variant='body2' color='text.secondary'>
                                                {`${(usage?.storage?.usage || 0).toFixed(2)}MB / ${(usage?.storage?.limit || 0).toFixed(
                                                    2
                                                )}MB`}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                                            <Box sx={{ width: '100%', mr: 1 }}>
                                                <LinearProgress
                                                    sx={{
                                                        height: 10,
                                                        borderRadius: 5,
                                                        '& .MuiLinearProgress-bar': {
                                                            backgroundColor: (theme) => {
                                                                if (storageUsageInPercent > 90) return theme.palette.error.main
                                                                if (storageUsageInPercent > 75) return theme.palette.warning.main
                                                                if (storageUsageInPercent > 50) return theme.palette.success.light
                                                                return theme.palette.success.main
                                                            }
                                                        }
                                                    }}
                                                    value={storageUsageInPercent > 100 ? 100 : storageUsageInPercent}
                                                    variant='determinate'
                                                />
                                            </Box>
                                            <Typography variant='body2' color='text.secondary'>{`${storageUsageInPercent.toFixed(
                                                2
                                            )}%`}</Typography>
                                        </Box>
                                    </Box>
                                </Box>
                            </SettingsSection>
                            <SettingsSection
                                action={
                                    <StyledButton onClick={saveProfileData} sx={{ borderRadius: 2, height: 40 }} variant='contained'>
                                        Save
                                    </StyledButton>
                                }
                                title='Profile'
                            >
                                <Box
                                    sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: gridSpacing,
                                        px: 2.5,
                                        py: 2
                                    }}
                                >
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        <Typography variant='body1'>Name</Typography>
                                        <OutlinedInput
                                            id='name'
                                            type='string'
                                            fullWidth
                                            placeholder='Your Name'
                                            name='name'
                                            onChange={(e) => setProfileName(e.target.value)}
                                            value={profileName}
                                        />
                                    </Box>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        <Typography variant='body1'>Email Address</Typography>
                                        <OutlinedInput
                                            id='email'
                                            type='string'
                                            fullWidth
                                            placeholder='Email Address'
                                            name='email'
                                            onChange={(e) => setEmail(e.target.value)}
                                            value={email}
                                        />
                                    </Box>
                                </Box>
                            </SettingsSection>
                            {!currentUser.isSSO && (
                                <SettingsSection
                                    action={
                                        <StyledButton
                                            disabled={!newPassword || !confirmPassword || newPassword !== confirmPassword}
                                            onClick={savePassword}
                                            sx={{ borderRadius: 2, height: 40 }}
                                            variant='contained'
                                        >
                                            Save
                                        </StyledButton>
                                    }
                                    title='Security'
                                >
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: gridSpacing,
                                            px: 2.5,
                                            py: 2
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                gridColumn: 'span 2 / span 2',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 1
                                            }}
                                        >
                                            <Typography variant='body1'>New Password</Typography>
                                            <OutlinedInput
                                                id='newPassword'
                                                type='password'
                                                fullWidth
                                                placeholder='New Password'
                                                name='newPassword'
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                value={newPassword}
                                            />
                                            <Typography variant='caption'>
                                                <i>
                                                    Password must be at least 8 characters long and contain at least one lowercase letter,
                                                    one uppercase letter, one digit, and one special character.
                                                </i>
                                            </Typography>
                                        </Box>
                                        <Box
                                            sx={{
                                                gridColumn: 'span 2 / span 2',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 1
                                            }}
                                        >
                                            <Typography variant='body1'>Confirm Password</Typography>
                                            <OutlinedInput
                                                id='confirmPassword'
                                                type='password'
                                                fullWidth
                                                placeholder='Confirm Password'
                                                name='confirmPassword'
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                value={confirmPassword}
                                            />
                                        </Box>
                                    </Box>
                                </SettingsSection>
                            )}
                        </>
                    )}
                </Stack>
            )}
            {openPricingDialog && isCloud && (
                <PricingDialog
                    open={openPricingDialog}
                    onClose={(planUpdated) => {
                        setOpenPricingDialog(false)
                        if (planUpdated) {
                            navigate('/')
                            navigate(0)
                        }
                    }}
                />
            )}
            {/* Remove Seats Dialog */}
            <Dialog fullWidth maxWidth='sm' open={openRemoveSeatsDialog} onClose={handleRemoveSeatsDialogClose}>
                <DialogTitle variant='h4'>Remove Additional Seats</DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {emptySeats === 0 ? (
                            <Typography
                                color='error'
                                sx={{
                                    p: 2,
                                    borderRadius: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1
                                }}
                            >
                                <IconAlertCircle size={20} />
                                You must remove users from your organization before removing seats.
                            </Typography>
                        ) : (
                            <Box
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 2,
                                    backgroundColor: theme.palette.background.paper,
                                    borderRadius: 1,
                                    p: 2
                                }}
                            >
                                {/* Occupied Seats */}
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant='body2'>Occupied Seats</Typography>
                                    <Typography variant='body2'>{occupiedSeats}</Typography>
                                </Box>

                                {/* Empty Seats */}
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant='body2'>Empty Seats</Typography>
                                    <Typography variant='body2'>{emptySeats}</Typography>
                                </Box>

                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant='body2'>Number of Empty Seats to Remove</Typography>
                                    <TextField
                                        size='small'
                                        type='number'
                                        value={seatsQuantity}
                                        onChange={(e) => {
                                            const value = Math.max(0, Math.min(emptySeats, parseInt(e.target.value) || 0))
                                            handleQuantityChange(value, 'remove')
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === '-' || e.key === 'e') {
                                                e.preventDefault()
                                            }
                                        }}
                                        InputProps={{
                                            inputProps: {
                                                min: 0,
                                                max: emptySeats,
                                                step: 1
                                            }
                                        }}
                                        sx={{ width: '70px' }}
                                        disabled={!getCustomerDefaultSourceApi.data}
                                    />
                                </Box>

                                {/* Total Seats */}
                                <Box
                                    sx={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        pt: 1.5,
                                        borderTop: `1px solid ${theme.palette.divider}`
                                    }}
                                >
                                    <Typography variant='h5'>New Total Seats</Typography>
                                    <Typography variant='h5'>{totalSeats - seatsQuantity}</Typography>
                                </Box>
                            </Box>
                        )}

                        {getAdditionalSeatsProrationApi.loading && (
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <CircularProgress size={16} />
                            </Box>
                        )}

                        {getCustomerDefaultSourceApi.loading ? (
                            <CircularProgress size={20} />
                        ) : getCustomerDefaultSourceApi.data?.invoice_settings?.default_payment_method ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 2 }}>
                                <Typography variant='subtitle2'>Payment Method</Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    {getCustomerDefaultSourceApi.data.invoice_settings.default_payment_method.card && (
                                        <>
                                            <IconCreditCard size={20} stroke={1.5} color={theme.palette.primary.main} />
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Typography sx={{ textTransform: 'capitalize' }}>
                                                    {getCustomerDefaultSourceApi.data.invoice_settings.default_payment_method.card.brand}
                                                </Typography>
                                                <Typography>
                                                    ••••{' '}
                                                    {getCustomerDefaultSourceApi.data.invoice_settings.default_payment_method.card.last4}
                                                </Typography>
                                                <Typography color='text.secondary'>
                                                    (expires{' '}
                                                    {
                                                        getCustomerDefaultSourceApi.data.invoice_settings.default_payment_method.card
                                                            .exp_month
                                                    }
                                                    /
                                                    {getCustomerDefaultSourceApi.data.invoice_settings.default_payment_method.card.exp_year}
                                                    )
                                                </Typography>
                                            </Box>
                                        </>
                                    )}
                                </Box>
                            </Box>
                        ) : (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2 }}>
                                <Typography color='error' sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <IconAlertCircle size={20} />
                                    No payment method found
                                </Typography>
                                <Button
                                    variant='contained'
                                    endIcon={<IconExternalLink />}
                                    onClick={() => {
                                        setOpenRemoveSeatsDialog(false)
                                        handleBillingPortalClick()
                                    }}
                                >
                                    Add Payment Method in Billing Portal
                                </Button>
                            </Box>
                        )}

                        {/* Proration info */}
                        {prorationInfo && (
                            <Box
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 2,
                                    backgroundColor: theme.palette.background.paper,
                                    borderRadius: 1,
                                    p: 2
                                }}
                            >
                                {/* Date Range */}
                                <Typography variant='body2' color='text.secondary'>
                                    {new Date(prorationInfo.currentPeriodStart * 1000).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric'
                                    })}{' '}
                                    -{' '}
                                    {new Date(prorationInfo.currentPeriodEnd * 1000).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                    })}
                                </Typography>

                                {/* Base Plan */}
                                <Box
                                    sx={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}
                                >
                                    <Typography variant='body2'>{currentPlanTitle}</Typography>
                                    <Typography variant='body2'>
                                        {prorationInfo.currency} {Math.max(0, prorationInfo.basePlanAmount).toFixed(2)}
                                    </Typography>
                                </Box>

                                {/* Additional Seats */}
                                <Box
                                    sx={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}
                                >
                                    <Box>
                                        <Typography variant='body2'>Additional Seats Left (Prorated)</Typography>
                                        <Typography variant='caption' color='text.secondary'>
                                            Qty {purchasedSeats - seatsQuantity}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ textAlign: 'right' }}>
                                        <Typography variant='body2'>
                                            {prorationInfo.currency} {Math.max(0, prorationInfo.additionalSeatsProratedAmount).toFixed(2)}
                                        </Typography>
                                        <Typography variant='caption' color='text.secondary'>
                                            {prorationInfo.currency} {prorationInfo.seatPerUnitPrice.toFixed(2)} each
                                        </Typography>
                                    </Box>
                                </Box>

                                {prorationInfo.prorationAmount < 0 && (
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}
                                    >
                                        <Typography variant='body2'>Credit balance</Typography>
                                        <Typography
                                            variant='body2'
                                            color={prorationInfo.prorationAmount < 0 ? 'success.main' : 'error.main'}
                                        >
                                            {prorationInfo.currency} {prorationInfo.prorationAmount < 0 ? '+' : ''}
                                            {Math.abs(prorationInfo.prorationAmount).toFixed(2)}
                                        </Typography>
                                    </Box>
                                )}

                                {/* Next Payment */}
                                <Box
                                    sx={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        pt: 1.5,
                                        borderTop: `1px solid ${theme.palette.divider}`
                                    }}
                                >
                                    <Typography variant='h5'>Due today</Typography>
                                    <Typography variant='h5'>
                                        {prorationInfo.currency} {Math.max(0, prorationInfo.prorationAmount).toFixed(2)}
                                    </Typography>
                                </Box>

                                {prorationInfo.prorationAmount < 0 && (
                                    <Typography
                                        variant='body2'
                                        sx={{
                                            color: 'info.main',
                                            fontStyle: 'italic'
                                        }}
                                    >
                                        Your available credit will automatically apply to your next invoice.
                                    </Typography>
                                )}
                            </Box>
                        )}
                    </Box>
                </DialogContent>
                {getCustomerDefaultSourceApi.data?.invoice_settings?.default_payment_method && (
                    <DialogActions>
                        <Button onClick={handleRemoveSeatsDialogClose} disabled={isUpdatingSeats}>
                            Cancel
                        </Button>
                        <Button
                            variant='outlined'
                            onClick={() => handleSeatsModification(purchasedSeats - seatsQuantity)}
                            disabled={
                                getCustomerDefaultSourceApi.loading ||
                                !getCustomerDefaultSourceApi.data ||
                                getAdditionalSeatsProrationApi.loading ||
                                isUpdatingSeats ||
                                seatsQuantity === 0 ||
                                emptySeats === 0
                            }
                            color='error'
                        >
                            {isUpdatingSeats ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <CircularProgress size={16} color='inherit' />
                                    Updating...
                                </Box>
                            ) : (
                                'Remove Seats'
                            )}
                        </Button>
                    </DialogActions>
                )}
            </Dialog>
            {/* Add Seats Dialog */}
            <Dialog fullWidth maxWidth='sm' open={openAddSeatsDialog} onClose={handleAddSeatsDialogClose}>
                <DialogTitle variant='h4'>Add Additional Seats</DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 2,
                                backgroundColor: theme.palette.background.paper,
                                borderRadius: 1,
                                p: 2
                            }}
                        >
                            {/* Occupied Seats */}
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant='body2'>Occupied Seats</Typography>
                                <Typography variant='body2'>{occupiedSeats}</Typography>
                            </Box>

                            {/* Included Seats */}
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant='body2'>Seats Included with Plan</Typography>
                                <Typography variant='body2'>{includedSeats}</Typography>
                            </Box>

                            {/* Additional Seats */}
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant='body2'>Additional Seats Purchased</Typography>
                                <Typography variant='body2'>{purchasedSeats}</Typography>
                            </Box>

                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant='body2'>Number of Additional Seats to Add</Typography>
                                <TextField
                                    size='small'
                                    type='number'
                                    value={seatsQuantity}
                                    onChange={(e) => {
                                        const value = Math.max(0, parseInt(e.target.value) || 0)
                                        handleQuantityChange(value, 'add')
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === '-' || e.key === 'e') {
                                            e.preventDefault()
                                        }
                                    }}
                                    InputProps={{
                                        inputProps: {
                                            min: 0
                                        }
                                    }}
                                    sx={{ width: '70px' }}
                                    disabled={!getCustomerDefaultSourceApi.data}
                                />
                            </Box>

                            {/* Total Seats */}
                            <Box
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    pt: 1.5,
                                    borderTop: `1px solid ${theme.palette.divider}`
                                }}
                            >
                                <Typography variant='h5'>New Total Seats</Typography>
                                <Typography variant='h5'>{totalSeats + seatsQuantity}</Typography>
                            </Box>
                        </Box>

                        {getAdditionalSeatsProrationApi.loading && (
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <CircularProgress size={16} />
                            </Box>
                        )}

                        {getCustomerDefaultSourceApi.loading ? (
                            <CircularProgress size={20} />
                        ) : getCustomerDefaultSourceApi.data?.invoice_settings?.default_payment_method ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 2 }}>
                                <Typography variant='subtitle2'>Payment Method</Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    {getCustomerDefaultSourceApi.data.invoice_settings.default_payment_method.card && (
                                        <>
                                            <IconCreditCard size={20} stroke={1.5} color={theme.palette.primary.main} />
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Typography sx={{ textTransform: 'capitalize' }}>
                                                    {getCustomerDefaultSourceApi.data.invoice_settings.default_payment_method.card.brand}
                                                </Typography>
                                                <Typography>
                                                    ••••{' '}
                                                    {getCustomerDefaultSourceApi.data.invoice_settings.default_payment_method.card.last4}
                                                </Typography>
                                                <Typography color='text.secondary'>
                                                    (expires{' '}
                                                    {
                                                        getCustomerDefaultSourceApi.data.invoice_settings.default_payment_method.card
                                                            .exp_month
                                                    }
                                                    /
                                                    {getCustomerDefaultSourceApi.data.invoice_settings.default_payment_method.card.exp_year}
                                                    )
                                                </Typography>
                                            </Box>
                                        </>
                                    )}
                                </Box>
                            </Box>
                        ) : (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2 }}>
                                <Typography color='error' sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <IconAlertCircle size={20} />
                                    No payment method found
                                </Typography>
                                <Button
                                    variant='contained'
                                    endIcon={<IconExternalLink />}
                                    onClick={() => {
                                        setOpenRemoveSeatsDialog(false)
                                        handleBillingPortalClick()
                                    }}
                                >
                                    Add Payment Method in Billing Portal
                                </Button>
                            </Box>
                        )}

                        {/* Proration info */}
                        {prorationInfo && (
                            <Box
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 2,
                                    backgroundColor: theme.palette.background.paper,
                                    borderRadius: 1,
                                    p: 2
                                }}
                            >
                                {/* Date Range */}
                                <Typography variant='body2' color='text.secondary'>
                                    {new Date(prorationInfo.currentPeriodStart * 1000).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric'
                                    })}{' '}
                                    -{' '}
                                    {new Date(prorationInfo.currentPeriodEnd * 1000).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                    })}
                                </Typography>

                                {/* Base Plan */}
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant='body2'>{currentPlanTitle}</Typography>
                                    <Typography variant='body2'>
                                        {prorationInfo.currency} {prorationInfo.basePlanAmount.toFixed(2)}
                                    </Typography>
                                </Box>

                                {/* Additional Seats */}
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Box>
                                        <Typography variant='body2'>Additional Seats (Prorated)</Typography>
                                        <Typography variant='caption' color='text.secondary'>
                                            Qty {seatsQuantity + purchasedSeats}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ textAlign: 'right' }}>
                                        <Typography variant='body2'>
                                            {prorationInfo.currency} {prorationInfo.additionalSeatsProratedAmount.toFixed(2)}
                                        </Typography>
                                        <Typography variant='caption' color='text.secondary'>
                                            {prorationInfo.currency} {prorationInfo.seatPerUnitPrice.toFixed(2)} each
                                        </Typography>
                                    </Box>
                                </Box>

                                {/* Credit Balance */}
                                {prorationInfo.creditBalance !== 0 && (
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Typography variant='body2'>Applied account balance</Typography>
                                        <Typography variant='body2' color={prorationInfo.creditBalance < 0 ? 'success.main' : 'error.main'}>
                                            {prorationInfo.currency} {prorationInfo.creditBalance.toFixed(2)}
                                        </Typography>
                                    </Box>
                                )}

                                {/* Next Payment */}
                                <Box
                                    sx={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        pt: 1.5,
                                        borderTop: `1px solid ${theme.palette.divider}`
                                    }}
                                >
                                    <Typography variant='h5'>Due today</Typography>
                                    <Typography variant='h5'>
                                        {prorationInfo.currency}{' '}
                                        {Math.max(0, prorationInfo.prorationAmount + prorationInfo.creditBalance).toFixed(2)}
                                    </Typography>
                                </Box>

                                {prorationInfo.prorationAmount === 0 && prorationInfo.creditBalance < 0 && (
                                    <Typography
                                        variant='body2'
                                        sx={{
                                            color: 'info.main',
                                            fontStyle: 'italic'
                                        }}
                                    >
                                        Your available credit will automatically apply to your next invoice.
                                    </Typography>
                                )}
                            </Box>
                        )}
                    </Box>
                </DialogContent>
                {getCustomerDefaultSourceApi.data?.invoice_settings?.default_payment_method && (
                    <DialogActions>
                        <Button onClick={handleAddSeatsDialogClose} disabled={isUpdatingSeats}>
                            Cancel
                        </Button>
                        <Button
                            variant='contained'
                            onClick={() => handleSeatsModification(seatsQuantity + purchasedSeats)}
                            disabled={
                                getCustomerDefaultSourceApi.loading ||
                                !getCustomerDefaultSourceApi.data ||
                                getAdditionalSeatsProrationApi.loading ||
                                isUpdatingSeats ||
                                seatsQuantity === 0
                            }
                        >
                            {isUpdatingSeats ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <CircularProgress size={16} color='inherit' />
                                    Updating...
                                </Box>
                            ) : (
                                'Add Seats'
                            )}
                        </Button>
                    </DialogActions>
                )}
            </Dialog>
        </MainCard>
    )
}

export default AccountSettings
