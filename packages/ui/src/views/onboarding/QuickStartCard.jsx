import PropTypes from 'prop-types'
import { Card, CardContent, CardActions, Typography, Button, Chip, Box } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { IconCheck } from '@tabler/icons-react'

// Quick start action card component
const QuickStartCard = ({ icon: Icon, title, description, timeEstimate, difficulty, completed, onClick }) => {
    const theme = useTheme()

    const difficultyColors = {
        beginner: 'success',
        intermediate: 'warning',
        advanced: 'error'
    }

    return (
        <Card
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s, box-shadow 0.2s',
                position: 'relative',
                opacity: completed ? 0.85 : 1,
                border: completed ? `2px solid ${theme.palette.success.main}` : undefined,
                '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: theme.shadows[8]
                }
            }}
        >
            {completed && (
                <Box
                    sx={{
                        position: 'absolute',
                        top: 12,
                        right: 12,
                        backgroundColor: theme.palette.success.main,
                        borderRadius: '50%',
                        width: 32,
                        height: 32,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1
                    }}
                >
                    <IconCheck size={20} color='white' />
                </Box>
            )}
            <CardContent sx={{ flexGrow: 1 }}>
                {Icon && (
                    <Box sx={{ mb: 2 }}>
                        <Icon size={40} color={theme.palette.primary.main} />
                    </Box>
                )}

                <Typography variant='h5' component='h3' gutterBottom>
                    {title}
                </Typography>

                <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                    {description}
                </Typography>

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {/* {completed && <Chip label='Completed' size='small' color='success' icon={<IconCheck size={16} />} />} */}
                    {timeEstimate && <Chip label={timeEstimate} size='small' variant='outlined' />}
                    {difficulty && (
                        <Chip
                            label={difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                            size='small'
                            color={difficultyColors[difficulty] || 'default'}
                        />
                    )}
                </Box>
            </CardContent>

            <CardActions sx={{ p: 2, pt: 0 }}>
                <Button
                    fullWidth
                    variant={completed ? 'outlined' : 'contained'}
                    color={completed ? 'success' : 'primary'}
                    onClick={onClick}
                    startIcon={completed ? <IconCheck size={18} /> : undefined}
                >
                    {completed ? 'Completed' : 'Start Guide'}
                </Button>
            </CardActions>
        </Card>
    )
}

QuickStartCard.propTypes = {
    icon: PropTypes.elementType,
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    timeEstimate: PropTypes.string,
    difficulty: PropTypes.oneOf(['beginner', 'intermediate', 'advanced']),
    completed: PropTypes.bool,
    onClick: PropTypes.func.isRequired
}

export default QuickStartCard
