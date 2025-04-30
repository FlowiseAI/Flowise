import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import IconButton from '@mui/material/IconButton'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import { useAnswers } from '../AnswersContext'

import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardActions from '@mui/material/CardActions'
import CardHeader from '@mui/material/CardHeader'
import Button from '@mui/material/Button'
import SnackMessage from '../SnackMessage'

import MessageIcon from '@mui/icons-material/Message'

import { Journey } from 'types'

interface JourneyCardProps extends Journey {
    _count: { chats: number }
}

interface Props {
    journey: JourneyCardProps
}

const JourneyCard = ({ journey }: Props) => {
    const { title, updatedAt, id, goal, _count } = journey
    const { upsertJourney } = useAnswers()
    const [theMessage, setTheMessage] = useState('')
    const router = useRouter()

    const [anchorEl, setAnchorEl] = useState(null)

    const handleMenuOpen = (event: any) => {
        event.stopPropagation()
        setAnchorEl(event.currentTarget)
    }

    const handleMenuClose = () => {
        setAnchorEl(null)
    }

    const handleMenuCompleteClick = async (event: any) => {
        // Perform complete action
        setTheMessage('Completing journey...')
        event.stopPropagation()
        const { data } = await upsertJourney({
            id: journey.id,
            completedAt: new Date()
        })

        handleMenuClose()
        setTheMessage('Completed Journey!')
    }

    const handleMenuEditClick = (event: any) => {
        event.stopPropagation()
        router.push(`/journey/${journey.id}/edit`)
        handleMenuClose()
    }

    const handleCardClick = (event: any) => {
        // Check if the target element is the card header
        if (!event?.target?.classList?.contains('MuiBackdrop-root')) {
            // Navigate to the journey using NextLink
            router.push(`/journey/${journey.id}`)
        }
    }

    return (
        <Card
            component={motion.div}
            layoutId={id}
            onClick={handleCardClick} // Add onClick event handler to the Card component
            sx={{
                flex: 1,
                height: '100%',
                display: 'flex',
                position: 'relative',
                alignItems: 'space-between',
                justifyContent: 'space-between',
                flexDirection: 'column'
            }}
        >
            <SnackMessage message={theMessage} />
            <CardHeader
                sx={{ flex: 1, display: 'flex', width: '100%' }}
                title={
                    <Typography
                        sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            textTransform: 'capitalize',
                            display: '-webkit-box',
                            WebkitBoxOrient: 'vertical',
                            WebkitLineClamp: '2'
                        }}
                    >
                        {title ?? goal}
                    </Typography>
                }
                titleTypographyProps={{ variant: 'body1' }}
            />

            <CardActions sx={{ justifyContent: 'space-between', width: '100%' }}>
                <Button disabled startIcon={<MessageIcon sx={{ fontSize: 16 }} />}>
                    {_count.chats}
                </Button>
                <IconButton aria-label='menu' aria-controls={`menu-${id}`} aria-haspopup='true' onClick={handleMenuOpen}>
                    <MoreVertIcon />
                </IconButton>
                <Menu id={`menu-${id}`} anchorEl={anchorEl} keepMounted open={Boolean(anchorEl)} onClose={handleMenuClose}>
                    <MenuItem onClick={handleMenuEditClick}>Edit</MenuItem>
                    <MenuItem onClick={handleMenuCompleteClick}>Complete</MenuItem>
                </Menu>
            </CardActions>
        </Card>
    )
}

export default JourneyCard
