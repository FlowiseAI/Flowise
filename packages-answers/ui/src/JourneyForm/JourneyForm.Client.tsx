'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Divider from '@mui/material/Divider'
import Grid2 from '@mui/material/Unstable_Grid2/Grid2'

import { AnswersProvider, useAnswers } from '../AnswersContext'
import SnackMessage from '../SnackMessage'

import { AppSettings, User, Journey } from 'types'

const JourneyFormNew = ({ appSettings, user, journey }: { appSettings: AppSettings; user: User; journey?: Journey }): JSX.Element => {
    return (
        <AnswersProvider user={user} appSettings={appSettings} journey={journey}>
            <JourneyForm appSettings={appSettings} journey={journey} />
        </AnswersProvider>
    )
}

const JourneyForm = ({ appSettings, journey }: { appSettings: AppSettings; journey?: Journey }) => {
    const router = useRouter()
    const [goal, setGoal] = useState(journey?.goal || '')
    const [query, setQuery] = useState<string>('')
    const [theMessage, setTheMessage] = useState('')
    const [tasks, setTasks] = useState<any[]>(journey?.tasks || [])
    const { updateFilter, upsertJourney, filters } = useAnswers()

    // eslint-disable-next-line react-hooks/exhaustive-deps
    // const taskManagerAgentUrl = appSettings?.taskManagerAgentUrl;
    // const taskManagerAgentUrl = `${flowiseHostName}/api/v1/prediction/be6bf6f0-51f3-415f-90c9-c550387028d5`;
    // const handleTaskManagerAgent = async (question: string) => {
    //   const response = await fetch(taskManagerAgentUrl, {
    //     method: 'POST',
    //     headers: {
    //       'Content-Type': 'application/json',
    //       'Authorization': `Bearer tfSApP1ZkO6cS++K4WDMocahyskuHnr5QzEvAkCEycw=`
    //     },
    //     body: JSON.stringify({ question })
    //   });

    //   if (!response.ok) {
    //     throw new Error(`HTTP error! status: ${response.status}`);
    //   }

    //   const data = await response.json();
    //   // set the tasks to the value of the properties of the data object
    //   const tasksArray = Object.values(data.json);
    //   setTasks(tasksArray);

    //   return data;
    // };

    const handleCreateNewJourney = async () => {
        try {
            setTheMessage('... Creating your journey')

            const { data: journey } = await upsertJourney({
                goal,
                filters
            })
            router.push(`/journey/${journey.id}`)
            setTheMessage('Your journey is ready....taking you there now.')
        } catch (err: any) {
            setTheMessage('There was an error creating your journey.   Please try again.')
            console.error(err)
        }
    }

    const handleUpdateJourney = async (id: any) => {
        try {
            setTheMessage('... Updating your journey')

            const { data: journey } = await upsertJourney({
                id,
                goal,
                filters
            })
            router.push(`/journey/${id}`)
            setTheMessage('Your journey is ready....taking you there now.')
        } catch (err: any) {
            setTheMessage('There was an error creating your journey.   Please try again.')
            console.error(err)
        }
    }

    return (
        <Box p={8} width='100%'>
            <SnackMessage message={theMessage} />
            {journey ? (
                <Typography variant='h2' component='h1'>
                    Edit Journey
                </Typography>
            ) : (
                <Typography variant='h2' component='h1'>
                    Create New Journey
                </Typography>
            )}

            <Divider sx={{ my: 2 }} />

            <Box sx={{ py: 2 }}>
                <Typography variant='h5' component='h2'>
                    What is the goal of your journey?
                </Typography>
                <TextField
                    variant='outlined'
                    fullWidth
                    multiline
                    rows={3}
                    value={goal}
                    onChange={(event) => {
                        setGoal(event.target.value)
                    }}
                    margin='normal'
                />
                <Button
                    // onClick={() => handleTaskManagerAgent(query)}
                    variant='contained'
                    color='primary'
                    type='submit'
                    size='large'
                >
                    Create Tasks
                </Button>
            </Box>

            <>
                <Box
                    sx={{
                        py: 2
                    }}
                >
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Typography variant='h5' component='h2'>
                            Journey Tasks
                        </Typography>
                    </Box>
                    <Grid2 container sx={{ pt: 3, gap: 2, width: '100%' }}>
                        {tasks.map((task: any, index: number) => {
                            return (
                                <Box
                                    key={index}
                                    sx={{
                                        p: 2,
                                        border: '1px solid #ccc',
                                        borderRadius: 4,
                                        width: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 2
                                    }}
                                >
                                    <Typography variant='h6' component='h3'>
                                        {task}
                                    </Typography>
                                </Box>
                            )
                        })}
                    </Grid2>
                </Box>
                <Box
                    sx={{
                        py: 2,
                        px: 8,
                        textAlign: 'right',
                        position: 'fixed',
                        bottom: 0,
                        right: 0,
                        width: '100%',
                        zIndex: 1000,
                        background: (theme) => theme.palette.background.paper
                    }}
                >
                    {journey ? (
                        <Button
                            sx={{}}
                            variant='contained'
                            color='primary'
                            type='submit'
                            size='large'
                            onClick={() => handleUpdateJourney(journey.id)}
                        >
                            Update Journey
                        </Button>
                    ) : (
                        <Button sx={{}} variant='contained' color='primary' type='submit' size='large' onClick={handleCreateNewJourney}>
                            Create New Journey
                        </Button>
                    )}
                </Box>
            </>
        </Box>
    )
}

export default JourneyFormNew
