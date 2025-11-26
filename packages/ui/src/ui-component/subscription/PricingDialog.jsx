import { useState, useEffect, useMemo } from 'react'
import { useSelector } from 'react-redux'
import PropTypes from 'prop-types'
import {
    Dialog,
    DialogContent,
    DialogTitle,
    Grid,
    Typography,
    Button,
    IconButton,
    Box,
    CircularProgress,
    DialogActions
} from '@mui/material'
import { IconX, IconCheck, IconCreditCard, IconExternalLink, IconAlertCircle } from '@tabler/icons-react'
import { useTheme, alpha } from '@mui/material/styles'
import accountApi from '@/api/account.api'
import pricingApi from '@/api/pricing'
import workspaceApi from '@/api/workspace'
import userApi from '@/api/user'
import useApi from '@/hooks/useApi'
import { useSnackbar } from 'notistack'
import { store } from '@/store'
import { upgradePlanSuccess } from '@/store/reducers/authSlice'

const PricingDialog = ({ open, onClose }) => {
    const customization = useSelector((state) => state.customization)
    const currentUser = useSelector((state) => state.auth.user)
    const theme = useTheme()
    const { enqueueSnackbar } = useSnackbar()

    const [openPlanDialog, setOpenPlanDialog] = useState(false)
    const [selectedPlan, setSelectedPlan] = useState(null)
    const [prorationInfo, setProrationInfo] = useState(null)
    const [isUpdatingPlan, setIsUpdatingPlan] = useState(false)
    const [purchasedSeats, setPurchasedSeats] = useState(0)
    const [occupiedSeats, setOccupiedSeats] = useState(0)
    const [workspaceCount, setWorkspaceCount] = useState(0)
    const [isOpeningBillingPortal, setIsOpeningBillingPortal] = useState(false)

    const getPricingPlansApi = useApi(pricingApi.getPricingPlans)
    const getCustomerDefaultSourceApi = useApi(userApi.getCustomerDefaultSource)
    const getPlanProrationApi = useApi(userApi.getPlanProration)
    const getAdditionalSeatsQuantityApi = useApi(userApi.getAdditionalSeatsQuantity)
    const getAllWorkspacesApi = useApi(workspaceApi.getAllWorkspacesByOrganizationId)

    useEffect(() => {
        getPricingPlansApi.request()
        getAdditionalSeatsQuantityApi.request(currentUser?.activeOrganizationSubscriptionId)

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const handlePlanClick = async (plan) => {
        if (plan.title === 'Enterprise') {
            window.location.href = 'mailto:hello@flowiseai.com'
            return
        }

        setSelectedPlan(plan)
        setOpenPlanDialog(true)
        getCustomerDefaultSourceApi.request(currentUser?.activeOrganizationCustomerId)
    }

    const handleBillingPortalClick = async () => {
        setIsOpeningBillingPortal(true)
        try {
            const response = await accountApi.getBillingData()
            if (response.data?.url) {
                setOpenPlanDialog(false)
                window.open(response.data.url, '_blank')
            }
        } catch (error) {
            console.error('Error accessing billing portal:', error)
        }
        setIsOpeningBillingPortal(false)
    }

    const handleUpdatePlan = async () => {
        if (!selectedPlan || !prorationInfo) return

        setIsUpdatingPlan(true)
        try {
            const response = await userApi.updateSubscriptionPlan(
                currentUser.activeOrganizationSubscriptionId,
                selectedPlan.prodId,
                prorationInfo.prorationDate
            )
            if (response.data.status === 'success') {
                // Subscription updated successfully
                store.dispatch(upgradePlanSuccess(response.data.user))
                enqueueSnackbar('Subscription updated successfully!', { variant: 'success' })
                onClose(true)
            } else {
                const errorMessage = response.data.message || 'Subscription failed to update'
                enqueueSnackbar(errorMessage, { variant: 'error' })
                onClose()
            }
        } catch (error) {
            console.error('Error updating plan:', error)
            const errorMessage = err.response?.data?.message || 'Failed to verify subscription'
            enqueueSnackbar(errorMessage, { variant: 'error' })
            onClose()
        } finally {
            setIsUpdatingPlan(false)
            setOpenPlanDialog(false)
        }
    }

    useEffect(() => {
        if (getAllWorkspacesApi.data) {
            setWorkspaceCount(getAllWorkspacesApi.data?.length || 0)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getAllWorkspacesApi.data])

    useEffect(() => {
        if (
            getCustomerDefaultSourceApi.data &&
            getCustomerDefaultSourceApi.data?.invoice_settings?.default_payment_method &&
            currentUser?.activeOrganizationSubscriptionId
        ) {
            getPlanProrationApi.request(currentUser.activeOrganizationSubscriptionId, selectedPlan.prodId)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getCustomerDefaultSourceApi.data])

    useEffect(() => {
        if (getPlanProrationApi.data) {
            setProrationInfo(getPlanProrationApi.data)
        }
    }, [getPlanProrationApi.data])

    useEffect(() => {
        if (getAdditionalSeatsQuantityApi.data) {
            const purchased = getAdditionalSeatsQuantityApi.data?.quantity || 0
            const occupied = getAdditionalSeatsQuantityApi.data?.totalOrgUsers || 1

            setPurchasedSeats(purchased)
            setOccupiedSeats(occupied)
        }
    }, [getAdditionalSeatsQuantityApi.data])

    const pricingPlans = useMemo(() => {
        if (!getPricingPlansApi.data) return []

        return getPricingPlansApi.data.map((plan) => {
            // Enterprise plan has special handling
            if (plan.title === 'Enterprise') {
                return {
                    ...plan,
                    buttonText: 'Contact Us',
                    buttonVariant: 'outlined',
                    buttonAction: () => handlePlanClick(plan)
                }
            }

            const isCurrentPlanValue = currentUser?.activeOrganizationProductId === plan.prodId
            const isStarterPlan = plan.title === 'Starter'

            if (isCurrentPlanValue && (plan.title === 'Pro' || plan.title === 'Enterprise')) {
                getAllWorkspacesApi.request(currentUser?.activeOrganizationId)
            }

            return {
                ...plan,
                currentPlan: isCurrentPlanValue,
                isStarterPlan,
                buttonText: isCurrentPlanValue ? 'Current Plan' : 'Get Started',
                buttonVariant: plan.mostPopular ? 'contained' : 'outlined',
                disabled: isCurrentPlanValue || !currentUser.isOrganizationAdmin,
                buttonAction: () => handlePlanClick(plan)
            }
        })

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getPricingPlansApi.data, currentUser.isOrganizationAdmin])

    const handleClose = () => {
        if (!isUpdatingPlan) {
            setProrationInfo(null)
            onClose()
        }
    }

    const handlePlanDialogClose = () => {
        if (!isUpdatingPlan) {
            setProrationInfo(null)
            setOpenPlanDialog(false)
        }
    }

    return (
        <>
            <Dialog
                open={open}
                onClose={handleClose}
                maxWidth='lg'
                PaperProps={{
                    sx: {
                        borderRadius: 2,
                        backgroundColor: (theme) => theme.palette.background.default,
                        boxShadow: customization.isDarkMode ? '0 0 50px 0 rgba(255, 255, 255, 0.5)' : '0 0 10px 0 rgba(0, 0, 0, 0.1)'
                    }
                }}
            >
                <DialogTitle
                    sx={{
                        mt: 2,
                        p: 2,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        position: 'relative'
                    }}
                >
                    <Typography variant='h3'>Pricing Plans</Typography>
                    <IconButton
                        onClick={handleClose}
                        sx={{
                            position: 'absolute',
                            right: 8,
                            top: '50%',
                            transform: 'translateY(-50%)'
                        }}
                        disabled={isUpdatingPlan}
                    >
                        <IconX />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <Grid container spacing={3} sx={{ p: 2 }}>
                        {pricingPlans.map((plan) => (
                            <Grid item xs={12} sm={6} md={3} key={plan.title}>
                                <Box
                                    sx={{
                                        p: 3,
                                        height: '100%',
                                        border: '2px solid',
                                        borderColor: (theme) =>
                                            plan.mostPopular
                                                ? theme.palette.primary.main
                                                : plan.currentPlan
                                                ? theme.palette.success.main
                                                : theme.palette.background.paper,
                                        borderRadius: 2,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        minHeight: '450px',
                                        position: 'relative',
                                        boxShadow: customization.isDarkMode
                                            ? '0 0 10px 0 rgba(255, 255, 255, 0.5)'
                                            : '0 0 10px 0 rgba(0, 0, 0, 0.1)',
                                        backgroundColor: (theme) => (plan.currentPlan ? alpha(theme.palette.success.main, 0.05) : 'inherit')
                                    }}
                                >
                                    {plan.currentPlan && (
                                        <Box
                                            sx={{
                                                position: 'absolute',
                                                top: 12,
                                                right: 12,
                                                backgroundColor: 'success.dark',
                                                borderRadius: 1,
                                                px: 1,
                                                py: 0.5
                                            }}
                                        >
                                            <Typography sx={{ color: 'white' }} variant='caption' fontWeight='bold'>
                                                Current Plan
                                            </Typography>
                                        </Box>
                                    )}
                                    {plan.mostPopular && !plan.currentPlan && (
                                        <Box
                                            sx={{
                                                position: 'absolute',
                                                top: 12,
                                                right: 12,
                                                backgroundColor: 'primary.main',
                                                borderRadius: 1,
                                                px: 1,
                                                py: 0.5
                                            }}
                                        >
                                            <Typography sx={{ color: 'white' }} variant='caption' fontWeight='bold'>
                                                Most Popular
                                            </Typography>
                                        </Box>
                                    )}
                                    <Typography variant='h4' gutterBottom>
                                        {plan.title}
                                    </Typography>
                                    <Typography
                                        variant='body2'
                                        color='text.secondary'
                                        sx={{
                                            opacity: customization.isDarkMode ? 0.7 : 1
                                        }}
                                        gutterBottom
                                    >
                                        {plan.subtitle}
                                    </Typography>
                                    <Box sx={{ mb: 3 }}>
                                        <Typography variant='h3' component='span'>
                                            {plan.price}
                                        </Typography>
                                        {plan.period && (
                                            <Typography
                                                sx={{
                                                    opacity: customization.isDarkMode ? 0.7 : 1
                                                }}
                                                variant='body1'
                                                component='span'
                                                color='text.secondary'
                                            >
                                                {plan.period}
                                            </Typography>
                                        )}
                                    </Box>
                                    <Box sx={{ flexGrow: 1 }}>
                                        {plan.features.map((feature, index) => (
                                            <Box key={index} sx={{ display: 'flex', alignItems: 'start', mb: 1 }}>
                                                <IconCheck color={theme.palette.success.dark} size={15} style={{ marginRight: 8 }} />
                                                <Box>
                                                    <Typography variant='body1'>{feature.text}</Typography>
                                                    {feature.subtext && (
                                                        <Typography
                                                            sx={{
                                                                opacity: customization.isDarkMode ? 0.7 : 1
                                                            }}
                                                            variant='caption'
                                                            color='text.secondary'
                                                        >
                                                            {feature.subtext}
                                                        </Typography>
                                                    )}
                                                </Box>
                                            </Box>
                                        ))}
                                    </Box>
                                    {plan.isStarterPlan && !plan.currentPlan && (
                                        <Box
                                            sx={{
                                                mt: 1,
                                                mb: -1,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    bgcolor: 'warning.light',
                                                    color: '#FF9800',
                                                    px: 2,
                                                    py: 0.5,
                                                    borderRadius: '16px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    fontWeight: 'bold',
                                                    fontSize: '0.9rem',
                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                                    position: 'relative'
                                                }}
                                            >
                                                First Month Free
                                            </Box>
                                        </Box>
                                    )}
                                    <Button
                                        fullWidth
                                        variant={plan.buttonVariant}
                                        sx={{ mt: 3 }}
                                        onClick={plan.buttonAction}
                                        disabled={plan.disabled}
                                    >
                                        {plan.currentPlan ? 'Current Plan' : plan.buttonText}
                                    </Button>
                                </Box>
                            </Grid>
                        ))}
                    </Grid>
                </DialogContent>
            </Dialog>

            <Dialog fullWidth maxWidth='sm' open={openPlanDialog} onClose={handlePlanDialogClose}>
                <DialogTitle variant='h4'>Confirm Plan Change</DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {purchasedSeats > 0 || occupiedSeats > 1 ? (
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
                                You must remove additional seats and users before changing your plan.
                            </Typography>
                        ) : workspaceCount > 1 ? (
                            <>
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
                                    You must remove all workspaces except the default workspace before changing your plan.
                                </Typography>
                            </>
                        ) : (
                            <>
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
                                                            {
                                                                getCustomerDefaultSourceApi.data.invoice_settings.default_payment_method
                                                                    .card.brand
                                                            }
                                                        </Typography>
                                                        <Typography>
                                                            ••••{' '}
                                                            {
                                                                getCustomerDefaultSourceApi.data.invoice_settings.default_payment_method
                                                                    .card.last4
                                                            }
                                                        </Typography>
                                                        <Typography color='text.secondary'>
                                                            (expires{' '}
                                                            {
                                                                getCustomerDefaultSourceApi.data.invoice_settings.default_payment_method
                                                                    .card.exp_month
                                                            }
                                                            /
                                                            {
                                                                getCustomerDefaultSourceApi.data.invoice_settings.default_payment_method
                                                                    .card.exp_year
                                                            }
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
                                            disabled={isOpeningBillingPortal}
                                            variant='contained'
                                            endIcon={!isOpeningBillingPortal && <IconExternalLink />}
                                            onClick={handleBillingPortalClick}
                                        >
                                            {isOpeningBillingPortal ? (
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <CircularProgress size={16} color='inherit' />
                                                    <span>Opening Billing Portal...</span>
                                                </Box>
                                            ) : (
                                                'Add Payment Method in Billing Portal'
                                            )}
                                        </Button>
                                    </Box>
                                )}

                                {getPlanProrationApi.loading && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <CircularProgress size={16} />
                                    </Box>
                                )}

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

                                        {/* First Month Free Notice */}
                                        {selectedPlan?.title === 'Starter' && prorationInfo.eligibleForFirstMonthFree && (
                                            <Box
                                                sx={{
                                                    p: 1.5,
                                                    bgcolor: 'warning.light',
                                                    color: 'warning.dark',
                                                    borderRadius: 1,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 1,
                                                    fontWeight: 'medium'
                                                }}
                                            >
                                                <Typography variant='body2' fontWeight='bold'>
                                                    {`You're eligible for your first month free!`}
                                                </Typography>
                                            </Box>
                                        )}

                                        {/* Base Plan */}
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Typography variant='body2'>{selectedPlan.title} Plan</Typography>
                                            <Typography variant='body2'>
                                                {prorationInfo.currency} {Math.max(0, prorationInfo.newPlanAmount).toFixed(2)}
                                            </Typography>
                                        </Box>

                                        {selectedPlan?.title === 'Starter' && prorationInfo.eligibleForFirstMonthFree && (
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Typography variant='body2'>First Month Discount</Typography>
                                                <Typography variant='body2' color='success.main'>
                                                    -{prorationInfo.currency} {Math.max(0, prorationInfo.newPlanAmount).toFixed(2)}
                                                </Typography>
                                            </Box>
                                        )}

                                        {/* Credit Balance */}
                                        {prorationInfo.prorationAmount > 0 && prorationInfo.creditBalance !== 0 && (
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center'
                                                }}
                                            >
                                                <Typography variant='body2'>Applied account balance</Typography>
                                                <Typography
                                                    variant='body2'
                                                    color={prorationInfo.creditBalance < 0 ? 'success.main' : 'error.main'}
                                                >
                                                    {prorationInfo.currency} {prorationInfo.creditBalance.toFixed(2)}
                                                </Typography>
                                            </Box>
                                        )}

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
                                                {prorationInfo.currency}{' '}
                                                {Math.max(0, prorationInfo.prorationAmount + prorationInfo.creditBalance).toFixed(2)}
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
                            </>
                        )}
                    </Box>
                </DialogContent>
                {getCustomerDefaultSourceApi.data?.invoice_settings?.default_payment_method && (
                    <DialogActions>
                        <Button onClick={handlePlanDialogClose} disabled={isUpdatingPlan}>
                            Cancel
                        </Button>
                        <Button
                            variant='contained'
                            onClick={handleUpdatePlan}
                            disabled={
                                getCustomerDefaultSourceApi.loading ||
                                !getCustomerDefaultSourceApi.data ||
                                getPlanProrationApi.loading ||
                                isUpdatingPlan ||
                                !prorationInfo ||
                                purchasedSeats > 0 ||
                                occupiedSeats > 1 ||
                                workspaceCount > 1
                            }
                        >
                            {isUpdatingPlan ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <CircularProgress size={16} color='inherit' />
                                    <span>Updating Plan...</span>
                                </Box>
                            ) : (
                                'Confirm Change'
                            )}
                        </Button>
                    </DialogActions>
                )}
            </Dialog>
        </>
    )
}

PricingDialog.propTypes = {
    open: PropTypes.bool,
    onClose: PropTypes.func
}

export default PricingDialog
