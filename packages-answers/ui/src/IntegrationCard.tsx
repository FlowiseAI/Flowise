import React, { ElementType } from 'react'

import { signIn } from 'next-auth/react'

import JourneySetting from '@ui/JourneySetting'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { useFlags } from 'flagsmith/react'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import CardActionArea from '@mui/material/CardActionArea'
import CardHeader from '@mui/material/CardHeader'
import Avatar from '@mui/material/Avatar'

import { useAnswers } from './AnswersContext'

import { AppService, AppSettings } from 'types'

interface IntegrationCardProps extends AppService {
    appSettings: AppSettings
    onClick?: () => void
    expanded?: boolean
    editable?: boolean
}

const IntegrationCard: React.FC<IntegrationCardProps> = ({
    appSettings,
    id,
    name,
    expanded,
    imageURL,
    providerId,
    onClick,
    enabled,
    editable
}) => {
    // const [expanded, setExpanded] = React.useState(false);
    const flags = useFlags(['delete_prompt', id])
    const integrationFlag = flags[id]
    const { deletePrompt, updatePrompt } = useAnswers()
    const [lastInteraction, setLastInteraction] = React.useState<string>('')
    // const onClick = () => {
    //   setExpanded(!expanded);
    // };

    enabled = enabled || integrationFlag?.enabled

    const handleAuthIntegration = () => {
        signIn(providerId)
    }

    const Wrapper: ElementType = expanded ? Box : CardActionArea
    return (
        <>
            <Card
                onClick={onClick}
                component={motion.div}
                layoutId={id}
                sx={{
                    flex: 1,
                    display: 'flex',
                    // transition: '.3s',
                    position: 'relative',
                    alignItems: 'space-between',
                    justifyContent: 'space-between',
                    flexDirection: 'column'
                }}
            >
                <Box
                    sx={{
                        width: '100%',
                        flex: '1',
                        display: 'flex'
                    }}
                >
                    <Wrapper
                        component='div'
                        sx={{
                            width: '100%',
                            minHeight: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            ...(flags?.delete_prompt?.enabled && {
                                paddingRight: 4
                            })
                            // paddingBottom: 4
                        }}
                        disabled={expanded}
                        onClick={onClick}
                    >
                        <CardContent
                            sx={{
                                width: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 2
                            }}
                        >
                            <CardHeader
                                avatar={
                                    <Avatar>
                                        {imageURL ? (
                                            <Image
                                                style={{ background: 'white', padding: '8px' }}
                                                src={imageURL}
                                                alt={`${name} logo`}
                                                width={40}
                                                height={40}
                                            />
                                        ) : (
                                            name[0]?.toUpperCase()
                                        )}
                                    </Avatar>
                                }
                                title={
                                    name ? (
                                        <Typography
                                            variant='body1'
                                            sx={{
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                textTransform: 'capitalize',
                                                display: '-webkit-box',
                                                WebkitLineClamp: '3',
                                                WebkitBoxOrient: 'vertical'
                                            }}
                                        >
                                            <strong>{name}</strong>
                                        </Typography>
                                    ) : null
                                }
                                action={
                                    providerId ? (
                                        <Button
                                            variant='contained'
                                            color='secondary'
                                            disabled={enabled && !expanded}
                                            onClick={handleAuthIntegration}
                                        >
                                            {expanded && enabled ? 'Refresh auth' : enabled ? 'Connected' : 'Connect'}
                                        </Button>
                                    ) : null
                                }
                                sx={{ p: 0, width: '100%', '.MuiCardHeader-action': { m: 0 } }}
                            />

                            {!enabled ? (
                                <Typography
                                    variant='body1'
                                    sx={{
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        textTransform: 'capitalize',
                                        display: '-webkit-box',
                                        WebkitLineClamp: '3',
                                        WebkitBoxOrient: 'vertical'
                                    }}
                                >
                                    {`Complete the integration with ${name}`}
                                </Typography>
                            ) : null}

                            {enabled ? (
                                <Box
                                    component={motion.div}
                                    sx={{
                                        transition: '.25s',
                                        overflow: 'hidden',
                                        py: 1,
                                        // transitionDelay: '1s',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        ...(expanded
                                            ? { maxHeight: '90vh', opacity: 1, transitionDelay: '4s' }
                                            : { maxHeight: 0, opacity: 0 })
                                    }}
                                >
                                    <Typography variant='overline'>Settings</Typography>
                                    <JourneySetting app={id} expanded={expanded} appSettings={appSettings} editable={editable} />
                                </Box>
                            ) : null}
                        </CardContent>
                    </Wrapper>
                </Box>

                {/* <CardActions
        sx={{
          display: 'flex',
          width: '100%',
          justifyContent: 'space-between',
          position: 'absolute',
          left: 0,
          bottom: 0
        }}>
        <Box>
          <IconButton
            color={lastInteraction === 'like' ? 'secondary' : 'default'}
            sx={{}}
            size="small"
            onClick={handleLike}>
            <ThumbUpIcon sx={{ fontSize: 16 }} />
          </IconButton>
          <IconButton
            size="small"
            color={lastInteraction === 'dislike' ? 'secondary' : 'default'}
            onClick={handleDislike}>
            <ThumbDownIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      </CardActions> */}
            </Card>
        </>
    )
}

export default IntegrationCard
