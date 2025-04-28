import React, { ElementType } from 'react'
import { motion } from 'framer-motion'
import { useFlags } from 'flagsmith/react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardActionArea from '@mui/material/CardActionArea'

interface JourneySourceCardProps {
    domain?: string
    urls?: string[]
    pageCount?: number
    onClick: any
}

const DomainCard: React.FC<JourneySourceCardProps> = ({ domain, urls, pageCount, onClick, ...other }) => {
    const flags = useFlags(['delete_prompt'])

    const Wrapper: ElementType = CardActionArea
    return (
        <>
            <Card
                component={motion.div}
                elevation={2}
                // layoutId={id}
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
                        onClick={onClick}
                        sx={{
                            width: '100%',
                            minHeight: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between'
                        }}
                    >
                        <CardContent
                            sx={{
                                width: '100%',
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 2,
                                padding: 1,
                                paddingBottom: '8px!important'
                            }}
                        >
                            {/* <Avatar>
                <Image
                  unoptimized
                  style={{ background: 'white', padding: '6px' }}
                  src={`${domain}/favicon.ico`}
                  alt={`${domain}`}
                  width={24}
                  height={24}
                />
              </Avatar> */}
                            {domain ? (
                                <Box>
                                    <Typography
                                        variant='body1'
                                        sx={{
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            display: '-webkit-box',
                                            WebkitLineClamp: '1',
                                            WebkitBoxOrient: 'vertical'
                                        }}
                                    >
                                        {domain}
                                    </Typography>
                                    {pageCount ? (
                                        <Typography variant='overline'>{pageCount ?? urls?.length} pages</Typography>
                                    ) : (
                                        <Typography variant='overline'>Click to index domain</Typography>
                                    )}
                                </Box>
                            ) : null}
                        </CardContent>
                    </Wrapper>
                </Box>
            </Card>
        </>
    )
}

export default DomainCard
