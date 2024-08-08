import React, { ElementType } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { signIn } from 'next-auth/react'
import { useFlags } from 'flagsmith/react'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import CardActionArea from '@mui/material/CardActionArea'
import CardHeader from '@mui/material/CardHeader'
import Avatar from '@mui/material/Avatar'

import { useAnswers } from '../AnswersContext'
import JourneySetting from '../JourneySetting'

import { AnswersFilters, AppService, AppSettings } from 'types'

interface JourneySourceCardProps extends AppService {
    appSettings: AppSettings
    filters: AnswersFilters
    updateFilter: (newFilter: AnswersFilters) => void
    onClick?: () => void
    expanded?: boolean
    editable?: boolean
}

const JourneySourceCard: React.FC<JourneySourceCardProps> = ({
    appSettings,
    id,
    name,
    expanded,
    imageURL,
    providerId,
    onClick,
    enabled,
    editable,
    filters,
    updateFilter,
    ...other
}) => {
    const flags = useFlags(['delete_prompt', id])
    enabled = enabled || flags[id]?.enabled
    const { deletePrompt, updatePrompt } = useAnswers()
    const [lastInteraction, setLastInteraction] = React.useState<string>('')
    const handleAuthIntegration = () => {
        signIn(providerId)
    }

    const Wrapper: ElementType = expanded ? Box : CardActionArea
    return (
        <>
            <Card
                component={motion.div}
                layoutId={id}
                sx={{
                    flex: 1,
                    display: 'flex',
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
                                    <Avatar variant='source'>
                                        {imageURL ? (
                                            <Image src={imageURL} alt={`${name} logo`} width={24} height={24} />
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
                                                WebkitLineClamp: expanded ? '100' : '3',
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
                                            variant='text'
                                            color='secondary'
                                            disabled={enabled && !expanded}
                                            onClick={handleAuthIntegration}
                                        >
                                            {expanded && enabled ? 'Refresh' : enabled ? 'Connected' : 'Connect'}
                                        </Button>
                                    ) : null
                                }
                                sx={{ p: 0, width: '100%', '.MuiCardHeader-action': { m: 0 } }}
                            />

                            <Box
                                component={motion.div}
                                sx={{
                                    transition: '.25s',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    ...(expanded ? { maxHeight: '90vh', transitionDelay: '3s' } : { maxHeight: 0 })
                                }}
                            >
                                {/* <Typography variant="overline">Filter Options</Typography> */}
                                <JourneySetting
                                    app={id}
                                    filters={filters}
                                    updateFilter={updateFilter}
                                    appSettings={appSettings}
                                    isJourney={true}
                                    {...other}
                                />
                            </Box>
                        </CardContent>
                    </Wrapper>
                </Box>
            </Card>
        </>
    )
}

export default JourneySourceCard
