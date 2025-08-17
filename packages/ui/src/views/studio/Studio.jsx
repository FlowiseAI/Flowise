import { Link } from 'react-router-dom'
import { Box, Grid, Card, CardContent, Typography, Button } from '@mui/material'
import { IconMessage, IconUsersGroup, IconRobot } from '@tabler/icons-react'

const tiles = [
  { title: 'Chatflows',  desc: 'Build single-agent systems, chatbots and simple LLM flows.', icon: <IconMessage size={40} />,    to: '/chatflows' },
  { title: 'Agentflows', desc: 'Multi-agent systems and workflow orchestration.',             icon: <IconUsersGroup size={40} />, to: '/agentflows' },
  { title: 'Assistants', desc: 'Create custom assistants with your choice of LLMs.',         icon: <IconRobot size={40} />,      to: '/assistants' }
]

export default function Studio() {
  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant='h2' sx={{ mb: 1 }}>Studio</Typography>
      <Typography variant='body2' sx={{ mb: 3 }}>Start with Prompting, RAG, and Agent use cases.</Typography>

      <Grid container spacing={2}>
        {tiles.map(t => (
          <Grid item key={t.title} xs={12} md={4}>
            <Card variant='outlined' sx={{ height: '100%' }}>
              <CardContent sx={{ display: 'grid', gap: 2 }}>
                <Box>{t.icon}</Box>
                <Typography variant='h4'>{t.title}</Typography>
                <Typography variant='body2' sx={{ minHeight: 48 }}>{t.desc}</Typography>
                <Button component={Link} to={t.to} variant='contained' sx={{ mt: 1, width: 140, borderRadius: 2 }}>Continue</Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}
