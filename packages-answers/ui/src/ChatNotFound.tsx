'use client'
import NextLink from 'next/link'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'

export const ChatNotFound = () => {
    return (
        <Box
            sx={{
                width: '100%',
                height: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2
                }}
            >
                <Typography variant='h4'>This chat is not found</Typography>
                <Typography variant='h5'>If this link was shared by somebody, make sure they invited you!</Typography>

                <Button variant='outlined' fullWidth href='/chat' component={NextLink}>
                    Start your own
                </Button>
            </Box>
        </Box>
    )
}

export default ChatNotFound
