// Studio.jsx
import React, { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Box, Grid, Card, CardContent, Typography, Button } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import { IconMessage, IconUsersGroup, IconRobot } from '@tabler/icons-react'

const tiles = [
  { title: 'Chatflows',  desc: 'Build single-agent systems, chatbots and simple LLM flows.', icon: <IconMessage size={40} />,    to: '/chatflows' },
  { title: 'Agentflows', desc: 'Multi-agent systems and workflow orchestration.',             icon: <IconUsersGroup size={40} />, to: '/agentflows' },
  { title: 'Assistants', desc: 'Create custom assistants with your choice of LLMs.',         icon: <IconRobot size={40} />,      to: '/assistants' }
]

function useRailGuardPadding(ref) {
  const theme = useTheme()
  const upMd = useMediaQuery(theme.breakpoints.up('md'))
  const [pad, setPad] = useState(0)

  useEffect(() => {
    if (!upMd) { setPad(0); return }

    const SAFE_PAD = 8
    const COLLAPSE_MAX = 120

    const measure = () => {
      const rail = document.querySelector('nav[aria-label="mailbox folders"]')
                 || document.querySelector('.MuiDrawer-paper')
      const railRect = rail?.getBoundingClientRect()
      const elRect = ref.current?.getBoundingClientRect()
      if (!railRect || !elRect) { setPad(0); return }

      const railWidth = railRect.width || 0
      const isCollapsed = railWidth > 0 && railWidth <= COLLAPSE_MAX
      const needed = isCollapsed
        ? Math.max(0, Math.ceil((railRect.right + SAFE_PAD) - elRect.left))
        : 0
      setPad(needed)
    }

    measure()

    const mo = new MutationObserver(measure)
    mo.observe(document.body, { attributes: true, childList: true, subtree: true })

    let ro
    const target = document.querySelector('nav[aria-label="mailbox folders"]')
                || document.querySelector('.MuiDrawer-paper')
    if (target && 'ResizeObserver' in window) {
      ro = new ResizeObserver(measure)
      ro.observe(target)
    }

    window.addEventListener('resize', measure)
    return () => {
      window.removeEventListener('resize', measure)
      mo.disconnect()
      if (ro) ro.disconnect()
    }
  }, [upMd, ref])

  return pad
}

export default function Studio() {
  const wrapperRef = useRef(null)
  const leftPad = useRailGuardPadding(wrapperRef)

  return (
    <Box
      ref={wrapperRef}
      sx={{ p: { xs: 2, md: 3 } }}
      style={{ paddingLeft: leftPad, transition: 'padding-left .15s ease' }}
    >
      <Typography variant='h2' sx={{ mb: 1 }}>Studio</Typography>
      <Typography variant='body2' sx={{ mb: 3 }}>
        Start with Prompting, RAG, and Agent use cases.
      </Typography>

      <Grid container spacing={2}>
        {tiles.map(t => (
          <Grid item key={t.title} xs={12} md={4}>
            <Card variant='outlined' sx={{ height: '100%' }}>
              <CardContent sx={{ display: 'grid', gap: 2 }}>
                <Box>{t.icon}</Box>
                <Typography variant='h4'>{t.title}</Typography>
                <Typography variant='body2' sx={{ minHeight: 48 }}>{t.desc}</Typography>
                <Button component={Link} to={t.to} variant='contained' sx={{ mt: 1, width: 140, borderRadius: 2 }}>
                  Continue
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}
