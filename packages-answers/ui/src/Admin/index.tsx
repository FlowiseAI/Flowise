import { Link } from 'react-router-dom'
// material-ui
import { Container, Stack, Typography, Card, CardContent, CardActions, Button } from '@mui/material'
import { useUser } from '@auth0/nextjs-auth0/client'
import { useFlags } from 'flagsmith/react'

const AdminDashboard = () => {
    const { user } = useUser()
    const flags = useFlags(['org:manage'])

    // Check if user is admin using multiple methods for compatibility
    const isAdmin = (Array.isArray(user?.roles) && user.roles.includes('Admin')) || flags['org:manage']?.enabled

    return (
        <Container>
            <Stack flexDirection='column' sx={{ gap: 3 }}>
                <Typography variant='h2' component='h1'>
                    Admin Dashboard
                </Typography>
                <Stack flexDirection='row' sx={{ gap: 3 }}>
                    <Card variant='outlined'>
                        <CardContent>
                            <Typography variant='h5' component='div'>
                                Billing
                            </Typography>
                            <Typography variant='body2'>Manage your billing and subscription.</Typography>
                        </CardContent>
                        <CardActions>
                            <Button component={Link} to='/admin/billing' size='small' fullWidth variant='contained'>
                                Manage
                            </Button>
                        </CardActions>
                    </Card>
                    {isAdmin && (
                        <>
                            <Card variant='outlined'>
                                <CardContent>
                                    <Typography variant='h5' component='div'>
                                        Chatflows
                                    </Typography>
                                    <Typography variant='body2'>Manage your chatflows and configurations.</Typography>
                                </CardContent>
                                <CardActions>
                                    <Button component={Link} to='/admin/chatflows' size='small' fullWidth variant='contained'>
                                        Manage
                                    </Button>
                                </CardActions>
                            </Card>
                            <Card variant='outlined'>
                                <CardContent>
                                    <Typography variant='h5' component='div'>
                                        Org Credentials
                                    </Typography>
                                    <Typography variant='body2'>Control which integrations are available to your organization.</Typography>
                                </CardContent>
                                <CardActions>
                                    <Button component={Link} to='/admin/org-credentials' size='small' fullWidth variant='contained'>
                                        Manage
                                    </Button>
                                </CardActions>
                            </Card>
                        </>
                    )}
                </Stack>
            </Stack>
        </Container>
    )
}

export default AdminDashboard
