'use client'
import Image from 'next/image'
import NextLink from 'next/link'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import Button from '@mui/material/Button'

import MessageIcon from '@mui/icons-material/Message'
import AddIcon from '@mui/icons-material/EditRoad'

import JourneyCard from '../JourneyLayout/JourneyCard'
import { Journey, User, AppSettings } from 'types'
import { AnswersProvider } from '../AnswersContext'

const HomepageClientWrapped = ({
    appSettings,
    user,
    journeys
}: {
    appSettings: AppSettings
    user: User
    journeys?: Journey[]
}): JSX.Element => {
    return (
        <AnswersProvider user={user} appSettings={appSettings}>
            <HomepageClient journeys={journeys} />
        </AnswersProvider>
    )
}

const HomepageClient = ({ journeys }: { journeys?: Journey[] }) => {
    return (
        <Box p={8}>
            <Image src={'/static/images/logos/answerai-logo-600-white-teal-orange.png'} alt={'AnswerAI Logo'} width={400} height={80} />
            <Divider sx={{ my: 2 }} />
            <Box my={4}>
                <Typography variant='h5' component='h2'>
                    Start Fresh...
                </Typography>
                <Box
                    mt={2}
                    sx={{
                        width: '100%',
                        height: 80,
                        gap: 2,
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, min-content))',
                        gridAutoFlow: 'dense',
                        transition: '.3s'
                    }}
                >
                    <Button component={NextLink} href='/journey/new' variant='contained' endIcon={<AddIcon />}>
                        <strong>New Journey</strong>
                    </Button>
                    <Button color='primary' component={NextLink} href='/chat' variant='outlined' endIcon={<MessageIcon fontSize='large' />}>
                        <strong>Quick chat</strong>
                    </Button>
                </Box>
            </Box>
            <Box my={4}>
                <Typography variant='h5' component='h2'>
                    Or continue ...
                </Typography>
                <Box
                    mt={2}
                    sx={{
                        width: '100%',
                        gap: 2,
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                        gridAutoFlow: 'dense',
                        transition: '.3s'
                    }}
                >
                    {journeys &&
                        !!journeys.length &&
                        journeys
                            ?.filter((journey) => !journey?.completed)
                            ?.map((journey, idx) => (
                                <Box key={journey.id}>
                                    <JourneyCard journey={journey as any} />
                                </Box>
                            ))}
                </Box>
            </Box>
        </Box>
    )
}

export default HomepageClientWrapped
