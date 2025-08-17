import { Box, Grid, Card, CardContent, Typography, Divider, List, ListItem, ListItemText } from '@mui/material'

// simple color palette
const PALETTE = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f472b6']

// --- Bar chart (colorful + hover highlight + native tooltip) ---
const BarChart = ({
  data = [450, 520, 480, 610, 560, 310, 330],
  labels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
  max = 650
}) => {
  const w = 520, h = 220, pad = 32, bw = 40, gap = 30
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet" style={{ display: 'block' }}>
      <line x1={pad} y1={h-pad} x2={w-pad} y2={h-pad} stroke="currentColor" strokeOpacity="0.15" />
      {data.map((v, i) => {
        const x = pad + i*(bw+gap)
        const y = (h-pad) - (v/max)*(h-2*pad)
        const bh = (v/max)*(h-2*pad)
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={bw}
              height={bh}
              rx="6"
              fill={PALETTE[i % PALETTE.length]}
              opacity="0.9"
              style={{ transition: 'opacity .15s, transform .15s', cursor: 'pointer' }}
              onMouseEnter={(e)=>{ e.currentTarget.style.opacity='1'; e.currentTarget.style.transform='translateY(-4px)'; }}
              onMouseLeave={(e)=>{ e.currentTarget.style.opacity='0.9'; e.currentTarget.style.transform='translateY(0)'; }}
            >
              <title>{`${labels[i]}: ${v}`}</title>
            </rect>
            <text x={x+bw/2} y={h-pad+16} textAnchor="middle" style={{ fontSize: 12, opacity: 0.6 }}>{labels[i]}</text>
          </g>
        )
      })}
    </svg>
  )
}

// --- Donut (multi-color + tooltips) ---
const Donut = ({ segments = [
  { label: 'Data Processing', value: 45 },
  { label: 'Customer Support', value: 25 },
  { label: 'Content Generation', value: 20 },
  { label: 'Analytics', value: 10 }
]}) => {
  const size = 220; const r = 80; const cx = size/2; const cy = size/2; const circ = 2*Math.PI*r
  let offset = 0
  const total = segments.reduce((a,b) => a+b.value, 0)
  return (
    <svg width="100%" height={size} viewBox={`0 0 ${size} ${size}`} preserveAspectRatio="xMidYMid meet">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth="20" />
      {segments.map((s, i) => {
        const frac = s.value/total
        const len = frac*circ
        const dasharray = `${len} ${circ-len}`
        const dashoffset = -offset
        offset += len
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={PALETTE[i % PALETTE.length]}
            strokeWidth="20"
            strokeDasharray={dasharray}
            strokeDashoffset={dashoffset}
            transform={`rotate(-90 ${cx} ${cy})`}
          >
            <title>{`${s.label}: ${s.value}%`}</title>
          </circle>
        )
      })}
    </svg>
  )
}

// --- Line chart (two colored series + points + tooltips) ---
const LineChart = ({
  success = [85, 88, 90, 92, 91, 95],
  error = [15, 12, 10, 9, 8, 5],
  labels = ['Jan','Feb','Mar','Apr','May','Jun']
}) => {
  const w = 520, h = 220, pad = 32, max = 100
  const x = (i) => pad + i*((w-2*pad)/(labels.length-1))
  const y = (v) => (h-pad) - (v/max)*(h-2*pad)
  const toPath = (arr) => arr.map((v,i)=>`${i===0?'M':'L'} ${x(i)} ${y(v)}`).join(' ')
  const successColor = '#3b82f6'  // blue
  const errorColor = '#22c55e'    // green

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet">
      <line x1={pad} y1={h-pad} x2={w-pad} y2={h-pad} stroke="currentColor" strokeOpacity="0.15" />
      <path d={toPath(success)} fill="none" stroke={successColor} strokeWidth="2.5" />
      <path d={toPath(error)} fill="none" stroke={errorColor} strokeWidth="2.5" opacity="0.9" />
      {labels.map((t,i)=>(
        <text key={i} x={x(i)} y={h-pad+16} textAnchor="middle" style={{ fontSize: 12, opacity: 0.6 }}>{t}</text>
      ))}
      {success.map((v,i)=>(
        <g key={`s-${i}`}>
          <circle cx={x(i)} cy={y(v)} r="4" fill={successColor}><title>{`Success ${labels[i]}: ${v}%`}</title></circle>
        </g>
      ))}
      {error.map((v,i)=>(
        <g key={`e-${i}`}>
          <circle cx={x(i)} cy={y(v)} r="4" fill={errorColor}><title>{`Error ${labels[i]}: ${v}%`}</title></circle>
        </g>
      ))}
    </svg>
  )
}

export default function Overview() {
  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h2" sx={{ mb: 1 }}>Workforce Overview</Typography>
      <Typography variant="body2" sx={{ mb: 3 }}>
        Start with a high-level view of your AI workforce.
      </Typography>

      {/* Top KPIs */}
      <Grid container spacing={2} sx={{ mb: 1 }}>
        {[
          { label: 'Total Workers', value: '1,245', sub: 'Currently deployed across all projects.' },
          { label: 'Tasks Completed (24h)', value: '8,973', sub: 'Successfully processed by all workers.' },
          { label: 'Active Workforce Rate', value: '92.5%', sub: 'Percentage of workers currently engaged.' },
          { label: 'Estimated Cost Savings', value: '$12,400', sub: 'Achieved this month through automation.' }
        ].map((k, i) => (
          <Grid item xs={12} md={3} key={i}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h5" sx={{ opacity: 0.7 }}>{k.label}</Typography>
                <Typography variant="h2" sx={{ mt: 1 }}>{k.value}</Typography>
                <Typography variant="caption" sx={{ opacity: 0.7 }}>{k.sub}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Middle row: bar + donut */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={7}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h4" sx={{ mb: 1 }}>Daily Task Completion</Typography>
              <Typography variant="caption" sx={{ opacity: 0.7 }}>Tasks completed by Workers per day.</Typography>
              <Box sx={{ mt: 2 }}>
                <BarChart />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={5}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h4" sx={{ mb: 1 }}>Worker Type Distribution</Typography>
              <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mb: 2 }}>
                Breakdown of AI Workers by type.
              </Typography>
              <Donut />
              <Divider sx={{ my: 2 }} />
              <List dense>
                {[
                  { k: 'Data Processing', v: '45%' },
                  { k: 'Customer Support', v: '25%' },
                  { k: 'Content Generation', v: '20%' },
                  { k: 'Analytics', v: '10%' }
                ].map((r,i)=>(
                  <ListItem key={i} disableGutters secondaryAction={<Typography variant="body2">{r.v}</Typography>}>
                    <ListItemText primary={<Typography variant="body2">{r.k}</Typography>} />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Bottom row: line + activity list (gap removed vs middle row) */}
      <Grid container spacing={2} sx={{ mt: 0 }}>
        <Grid item xs={12} md={7}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h4" sx={{ mb: 1 }}>Monthly Performance Trends</Typography>
              <Typography variant="caption" sx={{ opacity: 0.7 }}>Success and error rates over time.</Typography>
              <Box sx={{ mt: 2 }}>
                <LineChart />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={5}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h4" sx={{ mb: 1 }}>Recent Worker Activity</Typography>
              <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mb: 1 }}>
                Latest actions across your workforce.
              </Typography>
              <List dense>
                {[
                  { who: 'DataBot-007', what: 'Completed report generation', when: '5 min ago' },
                  { who: 'SupportAgent-001', what: 'Resolved customer inquiry', when: '15 min ago' },
                  { who: 'ContentGen-Alpha', what: 'Drafted marketing copy', when: '30 min ago' },
                  { who: 'AnalyticsPro-Beta', what: 'Processed quarterly sales data', when: '1 hour ago' }
                ].map((r,i)=>(
                  <ListItem key={i} disableGutters sx={{ py: 0.5 }}>
                    <ListItemText
                      primary={<Typography variant="body2" sx={{ fontWeight: 600 }}>{r.who}</Typography>}
                      secondary={<Typography variant="caption" sx={{ opacity: 0.7 }}>{r.what} • {r.when}</Typography>}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Footer links bar (static) */}
      {/* <Box sx={{ display: 'flex', gap: 3, mt: 2, pb: 2, opacity: 0.8, fontSize: 14 }}>
        <span>Resources</span><span>Legal</span><span>Contact Us</span>
      </Box> */}
    </Box>
  )
}
