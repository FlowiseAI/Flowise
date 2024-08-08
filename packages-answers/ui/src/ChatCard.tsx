import React from 'react'
import NextLink from 'next/link'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardActions from '@mui/material/CardActions'
import Button from '@mui/material/Button'
import CardActionArea from '@mui/material/CardActionArea'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import CardHeader from '@mui/material/CardHeader'

import MessageIcon from '@mui/icons-material/Message'
import Delete from '@mui/icons-material/Delete'

import { Chat } from 'types'

interface ChatCardProps extends Chat {
    filters: any
    // prompt: Prompt;
    // title?: string;
    // content: string;
    // actor?: string;
    // likes?: number;
    // views?: number;
    // usages?: number;
    // onClick: () => void;
}
import MoreVertIcon from '@mui/icons-material/MoreVert'
import MenuButton from './MenuButton'
import { useAnswers } from './AnswersContext'
const ChatCard: React.FC<ChatCardProps> = ({ id, prompt, filters, messages }) => {
    const { deleteChat } = useAnswers()
    const title = prompt?.content
    return (
        <Card
            sx={{
                display: 'flex',
                position: 'relative'
            }}
        >
            <CardHeader
                sx={{ position: 'absolute', top: 0, right: 0, zIndex: 1 }}
                action={
                    <MenuButton aria-label='menu' actions={[{ text: 'Delete Chat', onClick: () => deleteChat(id), icon: <Delete /> }]}>
                        <IconButton>
                            <MoreVertIcon />
                        </IconButton>
                    </MenuButton>
                }
            />

            <CardActionArea
                component={NextLink}
                prefetch={false}
                sx={{ minHeight: '100%', paddingRight: 4, paddingBottom: 4 }}
                href={`/chat/${id}`}
            >
                <Box
                    sx={{
                        width: '100%',
                        minHeight: '100%',
                        flex: '1',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                    }}
                >
                    <CardContent
                        sx={{
                            width: '100%',
                            flex: '1',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',

                            gap: 1
                        }}
                    >
                        {title ? (
                            <Typography
                                variant='body2'
                                color='text.secondary'
                                component='div'
                                sx={{
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    display: '-webkit-box',
                                    WebkitLineClamp: '3',
                                    WebkitBoxOrient: 'vertical'
                                }}
                            >
                                {title}
                            </Typography>
                        ) : null}
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            {Object.keys(filters)?.map((filter) =>
                                filters[filter]?.length ? (
                                    <Chip key={`${id}_${filter}`} label={filters[filter]?.join(', ')} size='small' />
                                ) : null
                            )}
                        </Box>
                    </CardContent>
                    {filters ? (
                        <CardActions
                            sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                position: 'absolute',
                                left: 0,
                                bottom: 0
                            }}
                        >
                            {messages ? (
                                <Button size='small' disabled startIcon={<MessageIcon sx={{ fontSize: 16 }} />}>
                                    {messages?.length}
                                </Button>
                            ) : null}
                        </CardActions>
                    ) : null}
                </Box>
            </CardActionArea>
        </Card>
    )
}

export default ChatCard
