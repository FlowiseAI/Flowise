'use client'
import { useState, useEffect, forwardRef } from 'react'
import useMarketplaceLanding from '@/hooks/useMarketplaceLanding'
import marketplacesApi from '@/api/marketplaces'
import { useAuth0 } from '@auth0/auth0-react'
import PropTypes from 'prop-types'
import { useSelector } from 'react-redux'
import { Typography, Button, Box, Chip, Tab, Tabs, Tooltip, Alert, Avatar, Divider, Menu, MenuItem, useTheme, Grid } from '@mui/material'
import { useNavigate } from '@/utils/navigation'
import { IconCopy, IconDownload, IconShare } from '@tabler/icons-react'
import MarketplaceCanvas from './MarketplaceCanvas'
import { StyledButton } from '@/ui-component/button/StyledButton'
import ErrorBoundary from '@/ErrorBoundary'
import { baseURL } from '@/store/constant'
import { Snackbar } from '@mui/material'

const MarketplaceLanding = forwardRef(function MarketplaceLanding({ templateId }, ref) {
    const navigate = useNavigate()
    const { isLoading, error, template } = useMarketplaceLanding(templateId)
    const { isAuthenticated, loginWithPopup } = useAuth0()
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

    const handleAction = async (type) => {
        if (type === 'new') {
            if (!template) return

            const isAgentCanvas = (template.flowData?.nodes || []).some(
                (node) => node.data.category === 'Multi Agents' || node.data.category === 'Sequential Agents'
            )
            if (!isAuthenticated) {
                await loginWithPopup()
            }

            // flowData.name = `Copy of ${flowData.name}`
            localStorage.setItem('duplicatedFlowData', JSON.stringify(template.flowData))

            navigate(`/${isAgentCanvas ? 'agentcanvas' : 'canvas'}`, {
                state: {
                    templateData: JSON.stringify(template),
                    templateName: template.name,
                    parentChatflowId: template.id
                }
            })
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
    // const encodedDomain = Buffer.from(window.location.host).toString('base64')
    const encodedDomain = Buffer.from(baseURL).toString('base64')
    const shareUrl = `${window.location.origin}/org/${encodedDomain}/marketplace/${templateId}`
    console.log('[MarketplaceLanding] shareUrl:', shareUrl)
    console.log('[MarketplaceLanding] host:', window.location.host)
    const handleShare = () => {
        navigator.clipboard.writeText(shareUrl)
        setSnackbarMessage('Share link copied to clipboard')
        setSnackbarOpen(true)
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
            <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                    <Box sx={{ mb: 2 }}>
                        <Typography variant='subtitle1' gutterBottom fontWeight='bold'>
                            Category
                        </Typography>
                        <Chip label={template.category} color='primary' />
                    </Box>
                    <Box sx={{ mb: 2 }}>
                        <Typography variant='subtitle1' gutterBottom fontWeight='bold'>
                            Usage Count
                        </Typography>
                        <Typography variant='body2'>{template.analytic ? JSON.parse(template.analytic).usageCount : 0} times</Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                        <Typography variant='subtitle1' gutterBottom fontWeight='bold'>
                            Created On
                        </Typography>
                        <Typography variant='body2'>{new Date(template.createdDate).toLocaleDateString()}</Typography>
                    </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                    <Box sx={{ mb: 2 }}>
                        <Typography variant='subtitle1' gutterBottom fontWeight='bold'>
                            Requirements
                        </Typography>
                        {template.apikeyid ? (
                            <Alert severity='warning' sx={{ mt: 1 }}>
                                This flow requires personal API tokens or credentials.
                            </Alert>
                        ) : (
                            <Typography variant='body2'>No special requirements</Typography>
                        )}
                    </Box>
                    <Box sx={{ mb: 2 }}>
                        <Typography variant='subtitle1' gutterBottom fontWeight='bold'>
                            Node Types
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            {images.slice(0, 3).map((img, index) => (
                                <Tooltip key={img} title={nodeTypes[index]} arrow>
                                    <Avatar src={img} sx={{ width: 30, height: 30 }} />
                                </Tooltip>
                            ))}
                            {images.length > 3 && <Typography variant='body2'>+ {images.length - 3} More</Typography>}
                        </Box>
                    </Box>
                </Grid>
            </Grid>
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
        </Box>
    )

    const renderActionButtons = () => (
        <Box sx={{ display: 'flex', gap: 2 }}>
            <StyledButton color='primary' variant='contained' onClick={() => handleAction('new')} startIcon={<IconCopy />}>
                Use as New Flow
            </StyledButton>
            <StyledButton color='secondary' variant='outlined' onClick={handleExportClick} startIcon={<IconDownload />}>
                Download
            </StyledButton>
            <StyledButton color='info' variant='outlined' onClick={handleShare} startIcon={<IconShare />}>
                Share
            </StyledButton>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleExportClose}>
                <MenuItem onClick={handleExportJSON}>Export as JSON</MenuItem>
            </Menu>
        </Box>
    )

    return (
        <Box ref={ref} sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
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
                    <Typography variant='h4' component='h1' gutterBottom fontWeight='bold'>
                        {template.name}
                    </Typography>
                </Box>
                {renderActionButtons()}
            </Box>
            <Divider sx={{ mb: 3 }} />
            <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 2 }}>
                <Tab label='Details' />
                <Tab label='Preview' />
            </Tabs>
            <Box sx={{ mt: 2 }}>
                {tabValue === 0 && renderTemplateDetails()}
                {tabValue === 1 && (
                    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <Typography variant='body2' paragraph>
                            This preview shows the structure of the flow. To use and customize this template, click &quot;Use as New
                            Flow&quot; above.
                        </Typography>
                        <Box sx={{ flexGrow: 1, minHeight: 400 }}>
                            <MarketplaceCanvas template={template} />
                        </Box>
                    </Box>
                )}
            </Box>
            <Snackbar open={snackbarOpen} autoHideDuration={3000} onClose={handleSnackbarClose} message={snackbarMessage} />
        </Box>
    )
})

MarketplaceLanding.propTypes = {
    templateId: PropTypes.string.isRequired
}

export default MarketplaceLanding
