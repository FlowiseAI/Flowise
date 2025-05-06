'use client'
import { signOut } from 'next-auth/react'
import { Session } from '@auth0/nextjs-auth0'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'

export const NotInvitedPage = ({ session }: { session: Session | undefined }) => {
    return (
        <Box
            sx={{
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1
                }}
            >
                <Typography variant='h4'>You are almost in!</Typography>
                <Typography variant='h5'>Answer AI is currently in closed beta.</Typography>
                <Typography variant='h6'>Check your emai for a confirmation soon!</Typography>

                <Button variant='outlined' fullWidth onClick={() => signOut()}>
                    Change account
                </Button>
            </Box>
        </Box>
    )
}
