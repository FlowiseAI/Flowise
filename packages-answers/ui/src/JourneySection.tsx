import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

import { Chat, Journey } from 'types'

interface Props {
    journeys?: Journey[]
    chats?: Chat[]
}

function JourneySection({ journeys, chats }: Props) {
    if (!journeys) {
        return (
            <Box>
                <Typography variant='h6'>No journeys yet</Typography>
                <Typography>To stat a journey select your data sources and ask a question</Typography>
            </Box>
        )
    }
}

export default JourneySection
