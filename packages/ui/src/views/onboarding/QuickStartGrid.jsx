import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Grid } from '@mui/material'
import { IconFileText, IconRobot, IconDatabase, IconTemplate } from '@tabler/icons-react'
import QuickStartCard from './QuickStartCard'

// Grid of quick start action cards
const QuickStartGrid = () => {
    const navigate = useNavigate()

    const { progress } = useSelector((state) => state.onboarding)

    const handleAction = (action, route) => {
        // Navigate with state to trigger guide for chatflow/agent/docstore creation or template exploration
        navigate(route, { state: { startGuide: true, guideType: action } })
    }

    const quickStartActions = [
        {
            icon: IconFileText,
            title: 'Create Your First Chatflow',
            description: 'Build a basic LLM pipeline with guided steps',
            timeEstimate: '~2 min',
            difficulty: 'beginner',
            action: 'create_chatflow',
            route: '/canvas',
            completed: progress.chatflowCreated
        },
        {
            icon: IconRobot,
            title: 'Build an Agent Flow (V2)',
            description: 'Create an AI agent with tools and memory',
            timeEstimate: '~5 min',
            difficulty: 'intermediate',
            action: 'create_agent',
            route: '/v2/agentcanvas',
            completed: progress.agentFlowCreated
        },
        {
            icon: IconDatabase,
            title: 'Add a Document Store',
            description: 'Set up document storage for RAG applications',
            timeEstimate: '~3 min',
            difficulty: 'beginner',
            action: 'create_docstore',
            route: '/document-stores',
            completed: progress.documentStoreAdded
        },
        {
            icon: IconTemplate,
            title: 'Explore Templates',
            description: 'Browse and import pre-built flow templates',
            timeEstimate: '~1 min',
            difficulty: 'beginner',
            action: 'explore_templates',
            route: '/marketplaces',
            completed: progress.marketplaceExplored
        }
    ]

    return (
        <Grid container spacing={3}>
            {quickStartActions.map((action, index) => (
                <Grid item xs={12} sm={6} md={3} key={index}>
                    <QuickStartCard
                        icon={action.icon}
                        title={action.title}
                        description={action.description}
                        timeEstimate={action.timeEstimate}
                        difficulty={action.difficulty}
                        completed={action.completed}
                        onClick={() => handleAction(action.action, action.route)}
                    />
                </Grid>
            ))}
        </Grid>
    )
}

QuickStartGrid.propTypes = {}

export default QuickStartGrid
