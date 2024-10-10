'use client'
import { useState, useEffect, forwardRef } from 'react'
import useMarketplaceLanding from '@/hooks/useMarketplaceLanding'
import marketplacesApi from '@/api/marketplaces'
import { useAuth0 } from '@auth0/auth0-react'
import PropTypes from 'prop-types'
import { useSelector } from 'react-redux'
import {
    AppBar,
    Toolbar,
    IconButton,
    Typography,
    Button,
    Box,
    Chip,
    Tab,
    Tabs,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Tooltip,
    Alert,
    Snackbar,
    Grid,
    Avatar,
    Divider,
    Menu,
    MenuItem,
    Card,
    CardContent,
    CardHeader,
    useTheme
} from '@mui/material'
import { useNavigate } from '@/utils/navigation'
import { IconArrowLeft, IconStar, IconCopy, IconStarFilled, IconDownload } from '@tabler/icons-react'
import MarketplaceCanvas from './MarketplaceCanvas'
import { StyledButton } from '@/ui-component/button/StyledButton'
import ErrorBoundary from '@/ErrorBoundary'
import { baseURL } from '@/store/constant'

const headerSX = {
    '& .MuiCardHeader-action': { mr: 0 }
}

const MarketplaceLanding = forwardRef(function MarketplaceLanding({ templateId, isDialog = false, onClose }, ref) {
    const navigate = useNavigate()
    const { isLoading, error, template } = useMarketplaceLanding(templateId)
    const { isAuthenticated, loginWithRedirect } = useAuth0()
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)

    const [isSignInPromptOpen, setIsSignInPromptOpen] = useState(false)
    const [actionType, setActionType] = useState(null)
    const [isFavorite, setIsFavorite] = useState(false)
    const [tabValue, setTabValue] = useState(0)
    const [snackbarOpen, setSnackbarOpen] = useState(false)
    const [snackbarMessage, setSnackbarMessage] = useState('')
    const [anchorEl, setAnchorEl] = useState(null)
    const [images, setImages] = useState([])
    const [nodeTypes, setNodeTypes] = useState([])

    useEffect(() => {
        if (isAuthenticated && template) {
            checkFavoriteStatus()
        }
    }, [isAuthenticated, template])

    useEffect(() => {
        if (template && template.flowData) {
            const flowData = JSON.parse(template.flowData)
            const nodes = flowData.nodes || []
            const processedImages = []
            const processedNodeTypes = []
            nodes.forEach((node) => {
                if (['Agents', 'Chains', 'Chat Models', 'Tools', 'Document Loaders'].includes(node.data.category)) {
                    const imageSrc = `${baseURL}/api/v1/node-icon/${node.data.name}`
                    if (!processedImages.includes(imageSrc)) {
                        processedImages.push(imageSrc)
                        processedNodeTypes.push(node.data.label)
                    }
                }
            })
            setImages(processedImages)
            setNodeTypes(processedNodeTypes)
        }
    }, [template])

    const checkFavoriteStatus = async () => {
        try {
            const favorites = await marketplacesApi.getFavorites()
            setIsFavorite(favorites.some((fav) => fav.chatflowId === templateId))
        } catch (error) {
            console.error('Error checking favorite status:', error)
        }
    }

    const toggleFavorite = async () => {
        if (!isAuthenticated) {
            setIsSignInPromptOpen(true)
            return
        }

        try {
            if (isFavorite) {
                await marketplacesApi.removeFavorite(templateId)
                setIsFavorite(false)
                setSnackbarMessage('Removed from favorites')
            } else {
                await marketplacesApi.addFavorite(templateId)
                setIsFavorite(true)
                setSnackbarMessage('Added to favorites')
            }
            setSnackbarOpen(true)
        } catch (error) {
            console.error('Error toggling favorite:', error)
            setSnackbarMessage('Error updating favorites')
            setSnackbarOpen(true)
        }
    }

    const handleAction = (type) => {
        if (type === 'new') {
            if (!template) return

            const isAgentCanvas = (template.flowData?.nodes || []).some(
                (node) => node.data.category === 'Multi Agents' || node.data.category === 'Sequential Agents'
            )
            navigate(`/${isAgentCanvas ? 'agentcanvas' : 'canvas'}`, {
                state: {
                    templateFlowData: typeof template.flowData === 'string' ? template.flowData : JSON.stringify(template.flowData),
                    templateName: template.name,
                    parentChatflowId: template.id
                }
            })
            if (isDialog && onClose) {
                onClose()
            }
        } else {
            setActionType(type)
            setIsSignInPromptOpen(true)
        }
    }

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue)
    }

    const handleSnackbarClose = (event, reason) => {
        if (reason === 'clickaway') {
            return
        }
        setSnackbarOpen(false)
    }

    const handleExportClick = (event) => {
        setAnchorEl(event.currentTarget)
    }

    const handleExportClose = () => {
        setAnchorEl(null)
    }

    const handleExportJSON = () => {
        const flowData = typeof template.flowData === 'string' ? JSON.parse(template.flowData) : template.flowData
        const jsonString = `data:text/json;chatset=utf-8,${encodeURIComponent(JSON.stringify(flowData, null, 2))}`
        const link = document.createElement('a')
        link.href = jsonString
        link.download = `${template.name}.json`
        link.click()
        handleExportClose()
    }

    if (isLoading) return <div>Loading...</div>
    if (error) return <ErrorBoundary error={error} />
    if (!template) return <div>Template not found</div>

    const renderTemplateDetails = () => (
        <Box sx={{ mt: 3 }}>
            <Typography variant='h6' gutterBottom fontWeight='bold'>
                About this template
            </Typography>
            <Typography variant='body2' paragraph>
                {template.description}
            </Typography>
            <Box sx={{ mt: 2 }}>
                <Typography variant='subtitle1' gutterBottom fontWeight='bold'>
                    Category
                </Typography>
                <Chip label={template.category} color='primary' />
            </Box>
            <Box sx={{ mt: 2 }}>
                <Typography variant='subtitle1' gutterBottom fontWeight='bold'>
                    Usage Count
                </Typography>
                <Typography variant='body2'>{template.analytic ? JSON.parse(template.analytic).usageCount : 0} times</Typography>
            </Box>
            <Box sx={{ mt: 2 }}>
                <Typography variant='subtitle1' gutterBottom fontWeight='bold'>
                    Requirements
                </Typography>
                {template.apikeyid ? (
                    <Alert severity='warning' sx={{ mt: 1 }}>
                        This flow requires personal API tokens or credentials. You must create a new flow in your account to use and
                        configure it properly.
                    </Alert>
                ) : (
                    <Typography variant='body2'>No special requirements</Typography>
                )}
            </Box>
            {template.tags && (
                <Box sx={{ mt: 2 }}>
                    <Typography variant='subtitle1' gutterBottom fontWeight='bold'>
                        Tags
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {template.tags.map((tag, index) => (
                            <Chip key={index} label={tag} variant='outlined' size='small' />
                        ))}
                    </Box>
                </Box>
            )}
            {template.framework && (
                <Box sx={{ mt: 2 }}>
                    <Typography variant='subtitle1' gutterBottom fontWeight='bold'>
                        Framework
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {template.framework.map((item, index) => (
                            <Chip key={index} label={item} variant='outlined' size='small' />
                        ))}
                    </Box>
                </Box>
            )}
            {template.usecases && (
                <Box sx={{ mt: 2 }}>
                    <Typography variant='subtitle1' gutterBottom fontWeight='bold'>
                        Use Cases
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {template.usecases.map((usecase, index) => (
                            <Chip key={index} label={usecase} variant='outlined' size='small' />
                        ))}
                    </Box>
                </Box>
            )}
            <Box sx={{ mt: 2 }}>
                <Typography variant='subtitle1' gutterBottom fontWeight='bold'>
                    Created On
                </Typography>
                <Typography variant='body2'>{new Date(template.createdDate).toLocaleDateString()}</Typography>
            </Box>
            <Box sx={{ mt: 2 }}>
                <Typography variant='subtitle1' gutterBottom fontWeight='bold'>
                    Node Types
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    {images.slice(0, images.length > 3 ? 3 : images.length).map((img, index) => (
                        <Tooltip key={img} title={nodeTypes[index]} arrow>
                            <Box
                                sx={{
                                    width: 30,
                                    height: 30,
                                    borderRadius: '50%',
                                    backgroundColor: customization.isDarkMode ? theme.palette.common.white : theme.palette.grey[300] + 75
                                }}
                            >
                                <img style={{ width: '100%', height: '100%', padding: 5, objectFit: 'contain' }} alt='' src={img} />
                            </Box>
                        </Tooltip>
                    ))}
                    {images.length > 3 && (
                        <Typography sx={{ alignItems: 'center', display: 'flex', fontSize: '.9rem', fontWeight: 200 }}>
                            + {images.length - 3} More
                        </Typography>
                    )}
                </Box>
            </Box>
        </Box>
    )

    const renderActionButtons = () => (
        <Box sx={{ display: 'flex', gap: 2 }}>
            <Tooltip title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}>
                <IconButton
                    onClick={toggleFavorite}
                    variant='outlined'
                    color='primary'
                    sx={{ border: '1px solid', borderColor: 'primary' }}
                >
                    {isFavorite ? <IconStarFilled /> : <IconStar />}
                </IconButton>
            </Tooltip>
            <StyledButton color='primary' variant='contained' onClick={() => handleAction('new')} startIcon={<IconCopy />}>
                Use as New Flow
            </StyledButton>
            <StyledButton color='secondary' variant='outlined' onClick={handleExportClick} startIcon={<IconDownload />}>
                Download
            </StyledButton>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleExportClose}>
                <MenuItem onClick={handleExportJSON}>Export as JSON</MenuItem>
            </Menu>
        </Box>
    )

    const content = (
        <Card
            ref={ref}
            sx={{
                background: theme.palette.card.main,
                color: theme.darkTextPrimary,
                boxShadow: '0 2px 14px 0 rgb(32 40 45 / 8%)',
                maxWidth: 1200,
                mx: 'auto',
                height: isDialog ? 'auto' : 'calc(100vh - 64px)',
                display: 'flex',
                flexDirection: 'column',
                '&:hover': {
                    background: theme.palette.card.hover,
                    boxShadow: '0 2px 14px 0 rgb(32 40 45 / 20%)'
                }
            }}
        >
            <CardHeader
                sx={headerSX}
                title={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {template.iconSrc && (
                            <Avatar
                                src={template.iconSrc}
                                alt={template.name}
                                sx={{
                                    width: 35,
                                    height: 35,
                                    borderRadius: '50%'
                                }}
                            />
                        )}
                        {!template.iconSrc && template.color && (
                            <Avatar
                                sx={{
                                    width: 35,
                                    height: 35,
                                    borderRadius: '50%',
                                    bgcolor: template.color
                                }}
                            />
                        )}
                        <Typography variant='h4' component='h1' gutterBottom fontWeight='bold'>
                            {template.name}
                        </Typography>
                    </Box>
                }
                action={renderActionButtons()}
            />
            <Divider />
            <CardContent sx={{ p: 2, flexGrow: 1, overflow: 'auto' }}>
                {/* <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                    <Box>
                        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                            <Chip
                                label={`Used ${template.analytic ? JSON.parse(template.analytic).usageCount : 0} times`}
                                variant='outlined'
                                size='small'
                            />
                            {template.apikeyid && <Chip label='Requires Personal Tokens' color='error' size='small' />}
                            {template.badge && <Chip label={template.badge} color='primary' size='small' />}
                            {template.type && <Chip label={template.type} variant='outlined' size='small' />}
                        </Box>
                    </Box>
                </Box> */}
                <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 2 }}>
                    <Tab label='Details' />
                    <Tab label='Preview' />
                </Tabs>
                <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                    {tabValue === 0 && renderTemplateDetails()}
                    {tabValue === 1 && (
                        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <Typography variant='body2' paragraph>
                                This preview shows the structure of the flow. To use and customize this template, click &quot;Use as New
                                Flow&quot; above.
                            </Typography>
                            <Box sx={{ flexGrow: 1, minHeight: 0 }}>
                                <MarketplaceCanvas template={template} />
                            </Box>
                        </Box>
                    )}
                </Box>
            </CardContent>
        </Card>
    )

    if (isDialog) {
        return content
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            <AppBar position='static' elevation={0} color='transparent'>
                <Toolbar>
                    <IconButton
                        edge='start'
                        color='inherit'
                        aria-label='back'
                        sx={{ mr: 2 }}
                        onClick={() => {
                            if (isDialog && onClose) {
                                onClose()
                            } else {
                                navigate('/chatflows')
                            }
                        }}
                    >
                        <IconArrowLeft />
                    </IconButton>
                    <Typography variant='body1' sx={{ flexGrow: 1 }}>
                        Explore Chatflows
                    </Typography>
                </Toolbar>
            </AppBar>
            <Box component='main' sx={{ flexGrow: 1, overflow: 'hidden' }}>
                {content}
            </Box>
            <Dialog open={isSignInPromptOpen} onClose={() => setIsSignInPromptOpen(false)}>
                <DialogTitle>Quick Login Required</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        To add this flow to your favorites for easy access, please log in. You&apos;ll find all your favorite templates in
                        one convenient place.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setIsSignInPromptOpen(false)} color='primary'>
                        Not Now
                    </Button>
                    <Button onClick={() => loginWithRedirect()} color='primary' variant='contained'>
                        Log In
                    </Button>
                </DialogActions>
            </Dialog>
            <Snackbar open={snackbarOpen} autoHideDuration={3000} onClose={handleSnackbarClose} message={snackbarMessage} />
        </Box>
    )
})

MarketplaceLanding.propTypes = {
    templateId: PropTypes.string.isRequired,
    isDialog: PropTypes.bool,
    onClose: PropTypes.func
}

export default MarketplaceLanding
