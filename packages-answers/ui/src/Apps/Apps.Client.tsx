'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useUser } from '@auth0/nextjs-auth0/client'
import {
    Container,
    Typography,
    Card,
    CardContent,
    CardActions,
    Button,
    Grid,
    Box,
    Avatar,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    alpha,
    useTheme
} from '@mui/material'

// App interface
interface App {
    id: string
    name: string
    icon: string
    description: string
    category: string
    features: string[]
    available: boolean
    href?: string
}

// Apps data from marketing site
const apps: App[] = [
    // Available Apps
    {
        id: 'csv-transformer',
        name: 'CSV Transformer',
        icon: '📊',
        description:
            'Effortlessly clean, reformat, and analyze your CSV data using intelligent AI algorithms. Perfect for data preparation, reporting, and ensuring data quality.',
        category: 'Data Processing',
        features: ['Smart Data Cleaning', 'Format Conversion', 'Analysis Tools', 'Secure Processing'],
        available: true,
        href: '/sidekick-studio/csv-transformer'
    },
    {
        id: 'image-creator',
        name: 'Image Creator',
        icon: '🎨',
        description:
            'Generate stunning, unique images from text descriptions or transform existing images with AI-powered enhancements. Perfect for marketing and creative projects.',
        category: 'Creative',
        features: ['Text-to-Image', 'Image Enhancement', 'Style Transfer', 'High Quality'],
        available: true,
        href: '/sidekick-studio/media-creator'
    },
    // Coming Soon Apps
    {
        id: 'ai-assessment-plan',
        name: 'AI Assessment Plan',
        icon: '🤖',
        description:
            'Talk to our voice agent to design a personalized AI strategy for your business. We create custom sidekicks, integrate them into your account, and help you optimize them over time for maximum productivity.',
        category: 'AI Strategy',
        features: ['Voice-Powered Assessment', 'Custom Sidekick Creation', 'Auto-Integration', 'Continuous Optimization'],
        available: false
    },
    {
        id: 'company-researcher',
        name: 'Company Researcher',
        icon: '🏢',
        description:
            'Research everything about any company using just their domain. Analyze websites, products, messaging, and positioning for marketing research, sales outreach, and competitive intelligence.',
        category: 'Business Intelligence',
        features: ['Domain-Based Research', 'Website Analysis', 'Marketing Intelligence', 'Competitive Insights'],
        available: false
    },
    {
        id: 'meeting-analyzer',
        name: 'Meeting Analyzer',
        icon: '📋',
        description:
            'Connect to Zoom and Teams to automatically summarize meetings, update JIRA statuses, gather client requirements, and maintain up-to-date account notes. Customizable templates ensure you never miss important details.',
        category: 'Project Management',
        features: ['Zoom/Teams Integration', 'Auto JIRA Updates', 'Requirements Gathering', 'Custom Templates'],
        available: false
    },
    {
        id: 'social-media-manager',
        name: 'Social Media Manager',
        icon: '📱',
        description:
            'Comprehensive social media management with AI agents. Connect all your channels, brainstorm content, integrate with Canva templates, transform blog posts into multimedia content, and optimize strategy based on audience performance analytics.',
        category: 'Social Media',
        features: ['Multi-Platform Integration', 'AI Content Creation', 'Canva Integration', 'Performance Analytics'],
        available: false
    },
    {
        id: 'writing-assistant',
        name: 'Writing Assistant',
        icon: '✍️',
        description:
            'Intelligent writing companion with browser extension integration. Generate first drafts from web content, podcasts, and team meetings. Get daily writing topics, integrate with Jira for requirements, and leverage AI sidekicks for real-time research assistance.',
        category: 'Content Creation',
        features: ['Browser Extension', 'Multi-Source Generation', 'Daily Writing Topics', 'Tool Integration'],
        available: false
    },
    {
        id: 'deep-research',
        name: 'Deep Research',
        icon: '🔍',
        description:
            'Harness the power of AI to analyze both external web data and internal company information. Generate comprehensive research reports and insights instantly.',
        category: 'Research',
        features: ['External Data Mining', 'Internal Data Analysis', 'Research Reports', 'Smart Insights'],
        available: false
    },
    {
        id: 'code-ide',
        name: 'Code IDE',
        icon: '💻',
        description:
            'AI-powered integrated development environment with intelligent code completion, debugging assistance, and automated code generation for faster development.',
        category: 'Development',
        features: ['AI Code Completion', 'Smart Debugging', 'Code Generation', 'Multi-Language'],
        available: false
    },
    {
        id: 'seo-analyzer',
        name: 'SEO & Website Analyzer',
        icon: '📈',
        description:
            'Comprehensive SEO analysis and website optimization recommendations powered by AI. Identify opportunities and track performance improvements.',
        category: 'Marketing',
        features: ['SEO Audits', 'Performance Metrics', 'Optimization Tips', 'Mobile Analysis'],
        available: false
    },
    {
        id: 'cms-publisher',
        name: 'CMS Publisher',
        icon: '📝',
        description:
            'Seamlessly create and publish content across multiple platforms with native Sanity and Contentful integrations. AI-powered content optimization included.',
        category: 'Content',
        features: ['Sanity Integration', 'Contentful Support', 'AI Optimization', 'Multi-Platform'],
        available: false
    },
    {
        id: 'call-analysis',
        name: 'Call Analysis',
        icon: '📞',
        description:
            'Automated insights from your voice communications. Extract key points, sentiment, and action items from meetings and calls with advanced AI processing.',
        category: 'Communication',
        features: ['Voice Recognition', 'Meeting Summaries', 'Sentiment Analysis', 'Action Items'],
        available: false
    },
    {
        id: 'ticket-analysis',
        name: 'Ticket Analysis',
        icon: '🎫',
        description:
            'Streamline customer support with AI-driven ticket insights. Categorize, prioritize, and route support requests intelligently with automated workflows.',
        category: 'Support',
        features: ['Auto-Categorization', 'Priority Scoring', 'Smart Routing', 'Performance Analytics'],
        available: false
    },
    {
        id: 'video-creation',
        name: 'Video Creation',
        icon: '🎬',
        description:
            'Generate compelling videos from text or simple inputs. Create engaging content for social media, presentations, and marketing with AI-powered video generation.',
        category: 'Creative',
        features: ['Text-to-Video', 'AI Enhancement', 'Multiple Formats', 'Custom Branding'],
        available: false
    },
    {
        id: 'agent-builder',
        name: 'Agent Builder',
        icon: '🤖',
        description:
            'Visually design and deploy custom AI agents for any task. No coding required - just drag, drop, and configure your intelligent workforce with intuitive visual tools.',
        category: 'AI Development',
        features: ['Visual Builder', 'No-Code Design', 'Instant Deployment', 'Workflow Automation'],
        available: false
    },
    {
        id: 'company-dashboards',
        name: 'Company Dashboards',
        icon: '📊',
        description:
            'Unified AI-powered insights across your business operations. Real-time analytics, predictive insights, and automated reporting to drive data-driven decisions.',
        category: 'Analytics',
        features: ['Real-time Analytics', 'Predictive Insights', 'Automated Reports', 'Custom Metrics'],
        available: false
    }
]

// Get Agent Modal Component
interface GetAgentModalProps {
    open: boolean
    onClose: () => void
    app: App | null
}

const GetAgentModal: React.FC<GetAgentModalProps> = ({ open, onClose, app }) => {
    if (!app) return null

    return (
        <Dialog open={open} onClose={onClose} maxWidth='md' fullWidth>
            <DialogTitle sx={{ pb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ fontSize: '2rem' }}>{app.icon}</Box>
                    <Box>
                        <Typography variant='h5' component='div' sx={{ fontWeight: 600 }}>
                            Get {app.name} Agent
                        </Typography>
                        <Typography variant='body2' color='text.secondary'>
                            Available for enterprise deployment
                        </Typography>
                    </Box>
                </Box>
            </DialogTitle>
            <DialogContent sx={{ pb: 2 }}>
                {/* Optional Screenshot Placeholder */}
                <Box
                    sx={{
                        width: '100%',
                        height: 200,
                        bgcolor: 'background.default',
                        border: '2px dashed',
                        borderColor: 'divider',
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 3
                    }}
                >
                    <Typography variant='body2' color='text.secondary'>
                        🖼️ Agent Screenshot Coming Soon
                    </Typography>
                </Box>

                {/* Benefits & Value */}
                <Typography variant='h6' sx={{ fontWeight: 600, mb: 2 }}>
                    Benefits & Value
                </Typography>
                <Typography variant='body1' paragraph>
                    {app.description}
                </Typography>

                <Typography variant='h6' sx={{ fontWeight: 600, mb: 2 }}>
                    Key Features
                </Typography>
                <Box sx={{ mb: 3 }}>
                    {app.features.map((feature, index) => (
                        <Typography key={index} variant='body2' sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                            <Box component='span' sx={{ mr: 1, color: 'primary.main' }}>
                                ✓
                            </Box>
                            {feature}
                        </Typography>
                    ))}
                </Box>

                <Box
                    sx={{
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        p: 3,
                        borderRadius: 2,
                        textAlign: 'center'
                    }}
                >
                    <Typography variant='h6' sx={{ fontWeight: 600, mb: 1 }}>
                        Ready to Deploy This Agent?
                    </Typography>
                    <Typography variant='body2' sx={{ mb: 2, opacity: 0.9 }}>
                        Schedule a consultation to discuss enterprise deployment, customization options, and integration with your existing
                        systems.
                    </Typography>
                </Box>
            </DialogContent>
            <DialogActions sx={{ p: 3, pt: 1 }}>
                <Button onClick={onClose} variant='outlined'>
                    Close
                </Button>
                <Button
                    component='a'
                    href='https://calendly.com/lastrev/answeragent-apps'
                    target='_blank'
                    rel='noopener noreferrer'
                    variant='contained'
                    sx={{ ml: 1 }}
                >
                    Schedule Consultation
                </Button>
            </DialogActions>
        </Dialog>
    )
}

// App Card Component
interface AppCardProps {
    app: App
    onGetAgent: (app: App) => void
}

const AppCard: React.FC<AppCardProps> = ({ app, onGetAgent }) => {
    const theme = useTheme()

    return (
        <Card
            sx={{
                borderRadius: 3,
                transition: 'all 0.3s ease',
                border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                background: `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.9)}, ${alpha(
                    theme.palette.background.paper,
                    0.95
                )})`,
                backdropFilter: 'blur(10px)',
                position: 'relative',
                overflow: 'hidden',
                height: 420,
                display: 'flex',
                flexDirection: 'column',
                mb: 2,
                '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.2)}`,
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`
                },
                '&:active': {
                    transform: 'translateY(-2px)'
                },
                opacity: app.available ? 1 : 0.85
            }}
        >
            <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                {/* Status indicator */}
                {!app.available && (
                    <Box
                        sx={{
                            position: 'absolute',
                            top: 12,
                            right: 12,
                            zIndex: 2
                        }}
                    >
                        <Chip
                            label='Coming Soon'
                            size='small'
                            sx={{
                                height: 24,
                                fontSize: '0.75rem',
                                bgcolor: alpha(theme.palette.warning.main, 0.1),
                                color: theme.palette.warning.main,
                                border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
                                '& .MuiChip-label': { px: 1.5 }
                            }}
                        />
                    </Box>
                )}

                {/* Avatar and Title */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar
                        sx={{
                            width: 50,
                            height: 50,
                            fontSize: '1.5rem',
                            fontWeight: 600,
                            bgcolor: 'transparent',
                            mr: 2
                        }}
                    >
                        {app.icon}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                            variant='h6'
                            sx={{
                                fontWeight: 600,
                                color: theme.palette.text.primary,
                                lineHeight: 1.2,
                                fontSize: '1.1rem',
                                mb: 0.5
                            }}
                        >
                            {app.name}
                        </Typography>
                        <Chip
                            label={app.category}
                            size='small'
                            sx={{
                                height: 20,
                                fontSize: '0.7rem',
                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                color: theme.palette.primary.main,
                                border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                                '& .MuiChip-label': { px: 1 }
                            }}
                        />
                    </Box>
                </Box>

                {/* Description */}
                <Typography
                    variant='body2'
                    sx={{
                        color: theme.palette.text.secondary,
                        fontSize: '0.875rem',
                        lineHeight: 1.4,
                        height: '63px', // Fixed height for exactly 3 lines (21px per line)
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitBoxOrient: 'vertical',
                        WebkitLineClamp: 3,
                        mb: 2
                    }}
                >
                    {app.description}
                </Typography>

                {/* Features */}
                <Box
                    sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 0.75,
                        mb: 2,
                        height: '56px', // Fixed height for 2 lines of chips (28px per line)
                        overflow: 'hidden',
                        alignContent: 'flex-start'
                    }}
                >
                    {app.features.slice(0, 6).map((feature, index) => (
                        <Chip
                            key={index}
                            label={feature}
                            size='small'
                            sx={{
                                height: 24,
                                fontSize: '0.75rem',
                                bgcolor: alpha(theme.palette.text.secondary, 0.08),
                                color: theme.palette.text.secondary,
                                border: `1px solid ${alpha(theme.palette.text.secondary, 0.1)}`,
                                '& .MuiChip-label': { px: 1.5 }
                            }}
                        />
                    ))}
                </Box>
            </CardContent>

            {/* Actions */}
            <CardActions sx={{ p: 3, pt: 0 }}>
                {app.available ? (
                    <Button
                        component={Link}
                        href={app.href!}
                        variant='contained'
                        fullWidth
                        sx={{
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: 600,
                            py: 1.5,
                            background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                            '&:hover': {
                                background: `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`
                            }
                        }}
                    >
                        Launch App
                    </Button>
                ) : (
                    <Button
                        onClick={() => onGetAgent(app)}
                        variant='outlined'
                        fullWidth
                        sx={{
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: 600,
                            py: 1.5,
                            border: `2px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                            color: theme.palette.primary.main,
                            '&:hover': {
                                border: `2px solid ${theme.palette.primary.main}`,
                                bgcolor: alpha(theme.palette.primary.main, 0.05)
                            }
                        }}
                    >
                        Get Agent
                    </Button>
                )}
            </CardActions>
        </Card>
    )
}

const Apps = () => {
    const { user, isLoading } = useUser()
    const theme = useTheme()
    const [getAgentModalOpen, setGetAgentModalOpen] = useState(false)
    const [selectedApp, setSelectedApp] = useState<App | null>(null)

    const handleGetAgent = (app: App) => {
        setSelectedApp(app)
        setGetAgentModalOpen(true)
    }

    if (isLoading) {
        return (
            <Container maxWidth='lg' sx={{ py: 4 }}>
                <Box sx={{ textAlign: 'center' }}>
                    <Typography variant='h4' sx={{ fontWeight: 600, mb: 2 }}>
                        Apps
                    </Typography>
                    <Typography>Loading...</Typography>
                </Box>
            </Container>
        )
    }

    return (
        <Container maxWidth='lg' sx={{ py: 4 }}>
            {/* Header */}
            <Box sx={{ textAlign: 'center', mb: 6 }}>
                <Box sx={{ mb: 4 }}>
                    <Image
                        src='/static/images/logos/answerai-logo-600-wide-white.png'
                        alt='AnswerAI Logo'
                        width={600}
                        height={120}
                        priority
                        style={{ width: '100%', maxWidth: '400px', height: 'auto' }}
                    />
                </Box>
                <Typography
                    variant='h6'
                    sx={{
                        color: theme.palette.text.secondary,
                        fontWeight: 400,
                        maxWidth: 600,
                        mx: 'auto',
                        lineHeight: 1.5
                    }}
                >
                    Pre-built AI agents and apps designed to solve specific problems and enhance productivity
                </Typography>
            </Box>

            {/* Apps Grid */}
            <Grid container spacing={4} sx={{ mb: 4 }}>
                {apps.map((app) => (
                    <Grid item xs={12} md={6} key={app.id}>
                        <AppCard app={app} onGetAgent={handleGetAgent} />
                    </Grid>
                ))}
            </Grid>

            {/* Get Agent Modal */}
            <GetAgentModal
                open={getAgentModalOpen}
                onClose={() => {
                    setGetAgentModalOpen(false)
                    setSelectedApp(null)
                }}
                app={selectedApp}
            />
        </Container>
    )
}

export default Apps
