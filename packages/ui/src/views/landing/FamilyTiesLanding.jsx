import { Box, Button, Card, CardContent, Chip, Container, Divider, Grid, Stack, Typography } from '@mui/material'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded'
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded'
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded'
import SparkleRoundedIcon from '@mui/icons-material/AutoAwesome'

const brand = {
    primary: '#2C3E4C',
    secondary: '#F0A202',
    accent: '#E63946',
    background: '#F9FAFB',
    surface: '#FFFFFF',
    textPrimary: '#14232F',
    textSecondary: '#4F6272',
    gradient: 'linear-gradient(135deg, #2C3E4C 0%, #1F6A8B 40%, #F0A202 100%)'
}

const stats = [
    { label: 'Families served', value: '12k+' },
    { label: 'Community advocates', value: '180+' },
    { label: 'Positive outcomes', value: '94%' }
]

const features = [
    {
        title: 'Guided onboarding',
        description: 'Personalized welcome paths ensure every family member feels seen, supported, and excited for what comes next.',
        icon: <SparkleRoundedIcon sx={{ fontSize: 40, color: brand.secondary }} />
    },
    {
        title: 'Memory timeline',
        description: 'Interactive storytelling tools make it easy to capture milestones, traditions, and the people behind them.',
        icon: <InsightsRoundedIcon sx={{ fontSize: 40, color: brand.secondary }} />
    },
    {
        title: 'Trusted circle sharing',
        description: 'Granular privacy controls let you celebrate openly while keeping sensitive family moments secure.',
        icon: <GroupsRoundedIcon sx={{ fontSize: 40, color: brand.secondary }} />
    }
]

const values = [
    'Celebrating legacy and culture across generations',
    'Designing compassionate digital experiences for every age',
    'Protecting stories with enterprise-grade security',
    'Building stronger family bonds through intentional connection'
]

const testimonials = [
    {
        quote:
            'Family Ties gave us a space where our grandparents and grandkids connect daily. It feels like our family history finally lives and breathes.',
        name: 'Dana Watkins',
        role: 'Family Ties Community Member'
    },
    {
        quote:
            'The onboarding was effortless. Within minutes we were sharing updates, organizing reunions, and preserving the recipes we love.',
        name: 'Rafael Ortega',
        role: 'Family Ambassador'
    }
]

const FamilyTiesLanding = () => {
    return (
        <Box component='main' sx={{ bgcolor: brand.background, color: brand.textPrimary }}>
            <Box
                sx={{
                    background: brand.gradient,
                    color: '#fff',
                    position: 'relative',
                    overflow: 'hidden'
                }}
            >
                <Box
                    sx={{
                        position: 'absolute',
                        inset: 0,
                        background: 'radial-gradient(circle at top right, rgba(255,255,255,0.25), transparent 55%)',
                        opacity: 0.8
                    }}
                />
                <Container maxWidth='lg' sx={{ position: 'relative', zIndex: 1, py: { xs: 10, md: 16 } }}>
                    <Stack spacing={4} alignItems='flex-start'>
                        <Chip
                            label='Introducing Family Ties'
                            sx={{
                                bgcolor: 'rgba(255, 255, 255, 0.16)',
                                color: '#fff',
                                px: 1.5,
                                py: 0.5,
                                fontWeight: 500,
                                fontSize: 14,
                                backdropFilter: 'blur(8px)'
                            }}
                        />
                        <Typography variant='h2' sx={{ fontWeight: 700, maxWidth: 720, lineHeight: 1.1 }}>
                            Where every story, celebration, and connection finds its place
                        </Typography>
                        <Typography variant='h6' sx={{ color: 'rgba(255,255,255,0.88)', maxWidth: 620, fontWeight: 400 }}>
                            Family Ties is the digital home built for modern families. Thoughtful design, meaningful rituals, and secure sharing keep your loved ones close—no matter the distance.
                        </Typography>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
                            <Button
                                size='large'
                                variant='contained'
                                endIcon={<ArrowForwardIcon />}
                                sx={{
                                    bgcolor: '#fff',
                                    color: brand.primary,
                                    px: 4,
                                    py: 1.5,
                                    fontWeight: 600,
                                    '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' }
                                }}
                            >
                                Request a walkthrough
                            </Button>
                            <Button
                                size='large'
                                variant='outlined'
                                sx={{
                                    borderColor: 'rgba(255,255,255,0.6)',
                                    color: '#fff',
                                    px: 4,
                                    py: 1.5,
                                    fontWeight: 600,
                                    '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.1)' }
                                }}
                            >
                                Explore the product
                            </Button>
                        </Stack>
                        <Grid container spacing={3} sx={{ pt: 2 }}>
                            {stats.map((stat) => (
                                <Grid item xs={12} sm={4} key={stat.label}>
                                    <Box sx={{ opacity: 0.9 }}>
                                        <Typography variant='h4' sx={{ fontWeight: 700 }}>
                                            {stat.value}
                                        </Typography>
                                        <Typography sx={{ color: 'rgba(255,255,255,0.8)' }}>{stat.label}</Typography>
                                    </Box>
                                </Grid>
                            ))}
                        </Grid>
                    </Stack>
                </Container>
            </Box>

            <Container maxWidth='lg' sx={{ py: { xs: 10, md: 14 } }}>
                <Grid container spacing={6} alignItems='center'>
                    <Grid item xs={12} md={6}>
                        <Stack spacing={3}>
                            <Typography variant='overline' sx={{ color: brand.accent, letterSpacing: 1.5, fontWeight: 600 }}>
                                The Family Ties difference
                            </Typography>
                            <Typography variant='h3' sx={{ fontWeight: 700 }}>
                                We blend warmth, technology, and tradition to keep every generation in sync
                            </Typography>
                            <Typography variant='body1' sx={{ color: brand.textSecondary, lineHeight: 1.7 }}>
                                From weekly spotlights to interactive timelines, Family Ties helps you honor shared history while designing new memories together. Every feature is intentionally crafted to feel intuitive, inclusive, and meaningful.
                            </Typography>
                            <Stack spacing={2}>
                                {values.map((value) => (
                                    <Stack direction='row' spacing={2} alignItems='center' key={value}>
                                        <CheckCircleRoundedIcon sx={{ color: brand.secondary }} />
                                        <Typography variant='subtitle1' sx={{ fontWeight: 600, color: brand.textPrimary }}>
                                            {value}
                                        </Typography>
                                    </Stack>
                                ))}
                            </Stack>
                        </Stack>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Grid container spacing={3}>
                            {features.map((feature) => (
                                <Grid item xs={12} sm={6} key={feature.title}>
                                    <Card
                                        elevation={0}
                                        sx={{
                                            height: '100%',
                                            bgcolor: brand.surface,
                                            borderRadius: 3,
                                            border: '1px solid',
                                            borderColor: 'rgba(20,35,47,0.08)',
                                            boxShadow: '0 24px 48px -24px rgba(17, 24, 39, 0.16)'
                                        }}
                                    >
                                        <CardContent sx={{ p: 3 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                                                {feature.icon}
                                            </Box>
                                            <Typography variant='h6' sx={{ fontWeight: 700, mb: 1 }}>
                                                {feature.title}
                                            </Typography>
                                            <Typography variant='body2' sx={{ color: brand.textSecondary, lineHeight: 1.6 }}>
                                                {feature.description}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    </Grid>
                </Grid>
            </Container>

            <Box sx={{ bgcolor: brand.surface, py: { xs: 10, md: 14 } }}>
                <Container maxWidth='lg'>
                    <Grid container spacing={6} alignItems='center'>
                        <Grid item xs={12} md={5}>
                            <Stack spacing={3}>
                                <Typography variant='overline' sx={{ color: brand.accent, letterSpacing: 1.5, fontWeight: 600 }}>
                                    Built for belonging
                                </Typography>
                                <Typography variant='h3' sx={{ fontWeight: 700 }}>
                                    Rituals that bring everyone home
                                </Typography>
                                <Typography variant='body1' sx={{ color: brand.textSecondary, lineHeight: 1.7 }}>
                                    Schedule reunion planning, collect updates, and celebrate achievements with guided rituals that nurture connection. Automated reminders and collaborative spaces make organizing family life effortless.
                                </Typography>
                                <Stack direction='row' spacing={1.5} alignItems='center'>
                                    <FavoriteRoundedIcon sx={{ color: brand.accent }} />
                                    <Typography variant='subtitle1' sx={{ fontWeight: 600 }}>
                                        Designed with empathy, inspired by real family traditions
                                    </Typography>
                                </Stack>
                            </Stack>
                        </Grid>
                        <Grid item xs={12} md={7}>
                            <Grid container spacing={3}>
                                {testimonials.map((testimonial) => (
                                    <Grid item xs={12} md={6} key={testimonial.name}>
                                        <Card
                                            elevation={0}
                                            sx={{
                                                height: '100%',
                                                borderRadius: 3,
                                                p: 3,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 3,
                                                border: '1px solid rgba(20,35,47,0.08)',
                                                background: 'linear-gradient(145deg, rgba(240,162,2,0.08), rgba(44,62,76,0.05))'
                                            }}
                                        >
                                            <Typography variant='body1' sx={{ color: brand.textPrimary, lineHeight: 1.7, flexGrow: 1 }}>
                                                “{testimonial.quote}”
                                            </Typography>
                                            <Divider sx={{ borderColor: 'rgba(20,35,47,0.08)' }} />
                                            <Box>
                                                <Typography variant='subtitle1' sx={{ fontWeight: 700 }}>
                                                    {testimonial.name}
                                                </Typography>
                                                <Typography variant='body2' sx={{ color: brand.textSecondary }}>
                                                    {testimonial.role}
                                                </Typography>
                                            </Box>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                        </Grid>
                    </Grid>
                </Container>
            </Box>

            <Container maxWidth='lg' sx={{ py: { xs: 10, md: 14 } }}>
                <Box
                    sx={{
                        borderRadius: 4,
                        p: { xs: 5, md: 7 },
                        background: 'linear-gradient(135deg, rgba(44,62,76,0.95), rgba(31,106,139,0.9))',
                        color: '#fff',
                        boxShadow: '0 40px 80px -32px rgba(15, 23, 42, 0.45)',
                        textAlign: 'center'
                    }}
                >
                    <Stack spacing={3} alignItems='center'>
                        <Typography variant='overline' sx={{ letterSpacing: 1.6, color: 'rgba(255,255,255,0.75)' }}>
                            Ready to begin?
                        </Typography>
                        <Typography variant='h3' sx={{ fontWeight: 700, maxWidth: 640 }}>
                            Let’s bring your family’s story to life with a tailored Family Ties experience
                        </Typography>
                        <Typography variant='body1' sx={{ color: 'rgba(255,255,255,0.85)', maxWidth: 540 }}>
                            Partner with our onboarding team to configure rituals, branding, and content that reflect your family’s voice from day one.
                        </Typography>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ pt: 1 }}>
                            <Button
                                size='large'
                                variant='contained'
                                sx={{
                                    bgcolor: brand.secondary,
                                    color: brand.primary,
                                    fontWeight: 700,
                                    px: 4,
                                    py: 1.5,
                                    '&:hover': { bgcolor: '#f3b436' }
                                }}
                            >
                                Schedule a kickoff call
                            </Button>
                            <Button
                                size='large'
                                variant='outlined'
                                sx={{
                                    borderColor: 'rgba(255,255,255,0.7)',
                                    color: '#fff',
                                    px: 4,
                                    py: 1.5,
                                    fontWeight: 600,
                                    '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.08)' }
                                }}
                            >
                                Download the playbook
                            </Button>
                        </Stack>
                    </Stack>
                </Box>
            </Container>
        </Box>
    )
}

export default FamilyTiesLanding
