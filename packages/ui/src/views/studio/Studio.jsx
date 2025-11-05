import React from 'react'
import { Link } from 'react-router-dom'
import { Box, Grid, Card, CardContent, Typography } from '@mui/material'
import { IconMessage, IconUsersGroup, IconRobot } from '@tabler/icons-react'
import MainCard from '@/ui-component/cards/MainCard'
import { StyledButton } from '@/ui-component/button/StyledButton'

const tiles = [
  {
    title: 'Chatflows',
    desc: 'Build single-agent systems, chatbots and simple LLM flows.',
    icon: <IconMessage size={40} />,
    to: '/chatflows'
  },
  {
    title: 'Agentflows',
    desc: 'Multi-agent systems and workflow orchestration.',
    icon: <IconUsersGroup size={40} />,
    to: '/agentflows'
  },
  {
    title: 'Assistants',
    desc: 'Create custom assistants with your choice of LLMs.',
    icon: <IconRobot size={40} />,
    to: '/assistants'
  }
]

export default function Studio() {
  return (
    <MainCard>
      <Box>
        <Typography variant='h2' sx={{ mb: 3 }}>
          Studio
        </Typography>

        <Grid container spacing={2}>
          {tiles.map((t) => (
            <Grid item key={t.title} xs={12} md={4}>
              <Card variant='outlined' sx={{ height: '100%' }}>
                <CardContent sx={{ display: 'grid', gap: 2 }}>
                  <Box>{t.icon}</Box>
                  <Typography variant='h4'>{t.title}</Typography>
                  <Typography variant='body2' sx={{ minHeight: 48 }}>
                    {t.desc}
                  </Typography>

                  <StyledButton
                    component={Link}
                    to={t.to}
                    sx={{
                      mt: 1,
                      width: 140,
                      borderRadius: 2
                    }}
                  >
                    Continue
                  </StyledButton>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </MainCard>
  )
}
