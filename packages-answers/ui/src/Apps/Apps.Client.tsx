'use client'
import Link from 'next/link'
// material-ui
import { Container, Stack, Typography, Card, CardContent, CardActions, Button } from '@mui/material'

const Apps = () => {
    return (
        <Container>
            <Stack flexDirection='column' sx={{ gap: 3 }}>
                <Typography variant='h2' component='h1'>
                    Apps
                </Typography>
                <Stack flexDirection='row' sx={{ gap: 3 }}>
                    <Card variant='outlined'>
                        <CardContent>
                            <Typography variant='h5' component='div'>
                                CSV Transformer
                            </Typography>
                            <Typography variant='body2'>Transform your CSV files with AI.</Typography>
                        </CardContent>
                        <CardActions>
                            <Button size='small' variant='contained' fullWidth component={Link} href='/sidekick-studio/csv-transformer'>
                                Start
                            </Button>
                        </CardActions>
                    </Card>
                </Stack>
            </Stack>
        </Container>
    )
}

export default Apps
