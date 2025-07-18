'use client'
import { useState, useEffect, forwardRef } from 'react'
import useMarketplaceLanding from '@/hooks/useMarketplaceLanding'
import PropTypes from 'prop-types'
import { useSelector } from 'react-redux'
import {
    useTheme,
    Typography,
    Box,
    Chip,
    Tooltip,
    Alert,
    Avatar,
    Divider,
    Menu,
    MenuItem,
    Tabs,
    Tab,
    useMediaQuery,
    Skeleton,
    Button,
    IconButton
} from '@mui/material'
import { useNavigate } from '@/utils/navigation'
import { IconCopy, IconDownload, IconShare } from '@tabler/icons-react'
import MarketplaceCanvas from './MarketplaceCanvas'
import { StyledButton } from '@/ui-component/button/StyledButton'
import ErrorBoundary from '@/ErrorBoundary'
import { baseURL } from '@/store/constant'
import { Snackbar } from '@mui/material'
import { useUser } from '@auth0/nextjs-auth0/client'
import { useNavigationState } from '@/utils/navigation'
import { Star as StarIcon, StarBorder as StarBorderIcon, Edit as EditIcon } from '@mui/icons-material'
import { styled, alpha } from '@mui/material/styles'
import { useCredentialChecker } from '@/hooks/useCredentialChecker'
import UnifiedCredentialsModal from '@/ui-component/dialog/UnifiedCredentialsModal'

const LoadingSkeleton = () => (
    <Box sx={{ maxWidth: '1080px', width: '100%', mx: 'auto', p: { xs: 2, sm: 3 }, height: '100%' }}>
        {/* Header Section */}
        <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Skeleton variant='circular' width={35} height={35} />
                <Skeleton variant='text' width={200} height={40} />
            </Box>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <Skeleton variant='rounded' width={120} height={36} />
                <Skeleton variant='rounded' width={120} height={36} />
                <Skeleton variant='rounded' width={120} height={36} />
            </Box>
            <Divider />
        </Box>

        {/* Content Section */}
        <Box sx={{ display: 'flex', height: 'calc(100% - 100px)' }}>
            {/* Left Panel */}
            <Box sx={{ width: '30%', pr: 2, borderRight: 1, borderColor: 'divider' }}>
                <Skeleton variant='text' width={140} height={32} sx={{ mb: 2 }} />
                <Skeleton variant='text' width='90%' height={100} sx={{ mb: 3 }} />
                <Skeleton variant='text' width={100} height={24} sx={{ mb: 1 }} />
                <Skeleton variant='rounded' width={120} height={32} sx={{ mb: 3 }} />
                <Skeleton variant='text' width={120} height={24} sx={{ mb: 1 }} />
                <Skeleton variant='text' width={80} height={24} sx={{ mb: 3 }} />
                <Skeleton variant='text' width={140} height={24} sx={{ mb: 1 }} />
                <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
                    <Skeleton variant='circular' width={30} height={30} />
                    <Skeleton variant='circular' width={30} height={30} />
                    <Skeleton variant='circular' width={30} height={30} />
                </Box>
                <Skeleton variant='text' width={80} height={24} sx={{ mb: 1 }} />
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Skeleton variant='rounded' width={60} height={24} />
                    <Skeleton variant='rounded' width={60} height={24} />
                    <Skeleton variant='rounded' width={60} height={24} />
                </Box>
            </Box>

            {/* Right Panel */}
            <Box sx={{ width: '70%', pl: 2 }}>
                <Skeleton variant='text' width={140} height={32} sx={{ mb: 2 }} />
                <Skeleton variant='text' width='90%' height={60} sx={{ mb: 3 }} />
                <Skeleton variant='rectangular' width='100%' height='calc(100% - 120px)' />
            </Box>
        </Box>
    </Box>
)

const WhiteButton = styled(Button)(({ theme }) => ({
    color: theme.palette.common.white,
    borderColor: theme.palette.common.white,
    '&:hover': {
        backgroundColor: alpha(theme.palette.primary.main, 0.08),
        borderColor: theme.palette.primary.main,
        color: theme.palette.primary.main
    }
}))

const WhiteIconButton = styled(IconButton)(({ theme }) => ({
    color: theme.palette.common.white,
    '&:hover': {
        backgroundColor: alpha(theme.palette.primary.main, 0.08),
        color: theme.palette.primary.main
    },
    '&.Mui-disabled': {
        color: alpha(theme.palette.common.white, 0.3)
    }
}))

const MarketplaceLanding = forwardRef(function MarketplaceLanding({ templateId, isDialog = false, onClose, onUse }, ref) {
    const navigate = useNavigate()
    const { isLoading, error, template } = useMarketplaceLanding(templateId)
    const { user } = useUser()
    const [, setNavigationState] = useNavigationState()
    const theme = useTheme()
    const isMobile = useMediaQuery(theme.breakpoints.down('md'))

    const [isSignInPromptOpen, setIsSignInPromptOpen] = useState(false)
    const [actionType, setActionType] = useState(null)
    const [snackbarOpen, setSnackbarOpen] = useState(false)
    const [snackbarMessage, setSnackbarMessage] = useState('')
    const [anchorEl, setAnchorEl] = useState(null)
    const [images, setImages] = useState([])
    const [nodeTypes, setNodeTypes] = useState([])
    const [tabValue, setTabValue] = useState(0)
    const customization = useSelector((state) => state.customization)

    const [isFavorite, setIsFavorite] = useState(false)

    // Credential checking hook
    const { showCredentialModal, missingCredentials, checkCredentials, handleAssign, handleSkip, handleCancel } = useCredentialChecker()

    useEffect(() => {
        if (templateId) {
            const storedFavorites = localStorage.getItem('favoriteSidekicks')
            if (storedFavorites) {
                const parsedFavorites = new Set(JSON.parse(storedFavorites))
                setIsFavorite(parsedFavorites.has(templateId))
            }
        }
    }, [templateId])

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

    const toggleFavorite = () => {
        if (!user) {
            setIsSignInPromptOpen(true)
            return
        }

        try {
            const storedFavorites = localStorage.getItem('favoriteSidekicks')
            const favorites = new Set(storedFavorites ? JSON.parse(storedFavorites) : [])

            if (isFavorite) {
                favorites.delete(templateId)
                setIsFavorite(false)
                setSnackbarMessage('Removed from favorites')
            } else {
                favorites.add(templateId)
                setIsFavorite(true)
                setSnackbarMessage('Added to favorites')
            }

            localStorage.setItem('favoriteSidekicks', JSON.stringify(Array.from(favorites)))
            setSnackbarOpen(true)
        } catch (error) {
            console.error('Error toggling favorite:', error)
            setSnackbarMessage('Error updating favorites')
            setSnackbarOpen(true)
        }
    }

    const proceedWithTemplate = (updatedFlowData, credentialAssignments) => {
        // console.log('🚀 proceedWithTemplate called with:', {
        //     updatedFlowData: typeof updatedFlowData,
        //     credentialAssignments,
        //     hasTemplate: !!template,
        //     hasUser: !!user
        // })

        if (!template) {
            // console.log('🚀 No template found, aborting')
            return
        }

        const isAgentCanvas = (template.flowData?.nodes || []).some(
            (node) => node.data.category === 'Multi Agents' || node.data.category === 'Sequential Agents'
        )

        // console.log('🚀 Canvas type determined:', { isAgentCanvas })

        const flowData = typeof updatedFlowData === 'string' ? JSON.parse(updatedFlowData) : updatedFlowData
        // console.log('🚀 Flow data structure:', {
        //     hasNodes: !!flowData.nodes,
        //     nodeCount: flowData.nodes?.length || 0,
        //     hasEdges: !!flowData.edges,
        //     edgeCount: flowData.edges?.length || 0
        // })

        // Store the data in the format Canvas component expects
        const chatflowData = {
            ...template,
            name: template.name,
            description: template.description,
            category: template.category,
            nodes: flowData.nodes || [],
            edges: flowData.edges || [],
            flowData: JSON.stringify(flowData),
            parentChatflowId: template.id
        }

        // console.log('🚀 Storing duplicated flow data:', {
        //     name: chatflowData.name,
        //     nodeCount: chatflowData.nodes.length,
        //     edgeCount: chatflowData.edges.length,
        //     hasFlowDataString: !!chatflowData.flowData
        // })

        localStorage.setItem('duplicatedFlowData', JSON.stringify(chatflowData))

        const state = {
            templateData: JSON.stringify(template),
            parentChatflowId: template.id
        }

        // console.log('🚀 Navigation state prepared:', state)

        if (!user) {
            const redirectUrl = `/sidekick-studio/${isAgentCanvas ? 'agentcanvas' : 'canvas'}`
            const loginUrl = `/api/auth/login?redirect_uri=${redirectUrl}`
            // console.log('🚀 No user, redirecting to login:', loginUrl)
            setNavigationState(state)
            window.location.href = loginUrl
        } else {
            const targetPath = `/${isAgentCanvas ? 'agentcanvas' : 'canvas'}`
            // console.log('🚀 User authenticated, navigating to:', targetPath)
            // console.log('🚀 About to call navigate...')
            navigate(targetPath, { state })
            // console.log('🚀 Navigate called successfully')
        }
    }

    const handleAction = async (type) => {
        if (type === 'new') {
            if (!template) {
                return
            }

            const flowData = typeof template.flowData === 'string' ? JSON.parse(template.flowData) : template.flowData

            // Check for missing credentials before proceeding
            checkCredentials(flowData, proceedWithTemplate)
        } else {
            setActionType(type)
            setIsSignInPromptOpen(true)
        }
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

    const encodedDomain = Buffer.from(baseURL).toString('base64')
    const shareUrl = `${window.location.origin}/org/${encodedDomain}/marketplace/${templateId}`

    const handleShare = () => {
        navigator.clipboard.writeText(shareUrl)
        setSnackbarMessage('Share link copied to clipboard')
        setSnackbarOpen(true)
    }

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue)
    }

    if (isLoading) return <LoadingSkeleton />
    if (error) return <ErrorBoundary error={error} />
    if (!template) return <div>Template not found</div>

    const renderTemplateDetails = () => (
        <Box sx={{ height: '100%', overflowY: 'auto' }}>
            <Typography variant='h6' gutterBottom fontWeight='bold'>
                About this template
            </Typography>
            <Typography variant='body2' paragraph>
                {template.description}
            </Typography>
            {template.category && (
                <Box sx={{ mb: 2 }}>
                    <Typography variant='subtitle1' gutterBottom fontWeight='bold'>
                        Category
                    </Typography>
                    <Chip label={template.category} color='primary' />
                </Box>
            )}
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
                    {images.length > 3 && <Typography variant='body2'>+ {images.length - 3} More</Typography>}
                </Box>
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
        </Box>
    )

    const renderActionButtons = () => (
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
            {template.isExecutable ? (
                <>
                    {template.isOwner ? (
                        <Tooltip title='Edit this sidekick'>
                            <WhiteIconButton
                                size='small'
                                onClick={() => {
                                    const isAgentCanvas = (template.flowData?.nodes || []).some(
                                        (node) => node.data.category === 'Multi Agents' || node.data.category === 'Sequential Agents'
                                    )
                                    navigate(`/${isAgentCanvas ? 'agentcanvas' : 'canvas'}/${template.id}`)
                                }}
                            >
                                <EditIcon />
                            </WhiteIconButton>
                        </Tooltip>
                    ) : null}
                    <Tooltip title='Clone this sidekick'>
                        <WhiteIconButton size='small' onClick={() => handleAction('new')}>
                            <IconCopy />
                        </WhiteIconButton>
                    </Tooltip>
                </>
            ) : (
                <Tooltip title='Clone this sidekick'>
                    <WhiteButton variant='outlined' endIcon={<IconCopy />} onClick={() => handleAction('new')}>
                        Clone
                    </WhiteButton>
                </Tooltip>
            )}
            <Tooltip
                title={!template.isExecutable ? 'Clone this sidekick to use it' : isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
                <span>
                    <WhiteIconButton onClick={toggleFavorite} size='small' disabled={!template.isExecutable && !isFavorite}>
                        {isFavorite ? <StarIcon /> : <StarBorderIcon />}
                    </WhiteIconButton>
                </span>
            </Tooltip>
            {template.isExecutable && (
                <Tooltip title='Use this sidekick'>
                    <Button variant='contained' size='small' onClick={() => handleAction('new')}>
                        Use
                    </Button>
                </Tooltip>
            )}
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

    const renderPreview = () => (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Typography variant='h6' gutterBottom fontWeight='bold'>
                Preview
            </Typography>
            <Typography variant='body2' paragraph>
                This preview shows the structure of the flow. To use and customize this template, click &quot;Use as New Flow&quot; above.
            </Typography>
            <Box sx={{ flexGrow: 1, position: 'relative', minHeight: 400 }}>
                <MarketplaceCanvas template={template} />
            </Box>
        </Box>
    )

    return (
        <Box
            ref={ref}
            sx={{
                maxWidth: '1080px',
                width: '100%',
                mx: 'auto',
                p: { xs: 2, sm: 3 },
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            <Box sx={{ mb: 3 }}>
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        alignItems: { xs: 'flex-start', sm: 'center' },
                        justifyContent: 'space-between',
                        gap: 2,
                        mb: 2
                    }}
                >
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
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>{renderActionButtons()}</Box>
                </Box>
                <Divider />
            </Box>
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, overflow: 'hidden' }}>
                {isMobile ? (
                    <>
                        <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>{tabValue === 0 ? renderTemplateDetails() : renderPreview()}</Box>
                        <Tabs
                            value={tabValue}
                            onChange={handleTabChange}
                            variant='fullWidth'
                            sx={{
                                position: 'sticky',
                                bottom: 0,
                                bgcolor: 'background.paper',
                                zIndex: 1000,
                                borderTop: 1,
                                borderColor: 'divider'
                            }}
                        >
                            <Tab label='Details' />
                            <Tab label='Preview' />
                        </Tabs>
                    </>
                ) : (
                    <>
                        <Box sx={{ width: '30%', pr: 2, overflowY: 'auto', borderRight: 1, borderColor: 'divider' }}>
                            {renderTemplateDetails()}
                        </Box>
                        <Box sx={{ width: '70%', pl: 2, overflowY: 'auto' }}>{renderPreview()}</Box>
                    </>
                )}
            </Box>
            <Snackbar open={snackbarOpen} autoHideDuration={3000} onClose={handleSnackbarClose} message={snackbarMessage} />

            {/* Unified Credentials Modal */}
            <UnifiedCredentialsModal
                show={showCredentialModal}
                missingCredentials={missingCredentials}
                onAssign={handleAssign}
                onSkip={handleSkip}
                onCancel={handleCancel}
                flowData={template?.flowData}
            />
        </Box>
    )
})

MarketplaceLanding.propTypes = {
    templateId: PropTypes.string.isRequired,
    isDialog: PropTypes.bool,
    onClose: PropTypes.func,
    onUse: PropTypes.func,
    template: PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        description: PropTypes.string,
        category: PropTypes.string,
        flowData: PropTypes.oneOfType([PropTypes.string, PropTypes.object]).isRequired,
        isOwner: PropTypes.bool,
        isExecutable: PropTypes.bool,
        tags: PropTypes.arrayOf(PropTypes.string)
    })
}

MarketplaceLanding.defaultProps = {
    isDialog: false,
    onClose: () => {},
    onUse: () => {}
}

export default MarketplaceLanding
