import PropTypes from 'prop-types'

import { styled } from '@mui/material/styles'
import { Box, Chip, Grid, Typography, useTheme } from '@mui/material'

import MainCard from '@/ui-component/cards/MainCard'

import { IconBook2, IconFileText, IconUpload } from '@tabler/icons-react'

const CardWrapper = styled(MainCard)(({ theme }) => ({
    background: theme.palette.card.main,
    color: theme.darkTextPrimary,
    overflow: 'auto',
    position: 'relative',
    boxShadow: '0 2px 14px 0 rgb(32 40 45 / 8%)',
    cursor: 'pointer',
    '&:hover': {
        background: theme.palette.card.hover,
        boxShadow: '0 2px 14px 0 rgb(32 40 45 / 20%)'
    },
    height: '100%',
    minHeight: '160px',
    maxHeight: '300px',
    width: '100%',
    overflowWrap: 'break-word',
    whiteSpace: 'pre-line'
}))

// Card shown inside the Tools view -> Skills tab. Accepts the
// Skill entity summary returned by GET /skills.
const SkillCard = ({ data, onClick }) => {
    const theme = useTheme()
    const color = data.color || theme.palette.primary.main
    const fileCount = data.fileCount ?? 0
    const hasPublished = !!data.publishedBundleId

    return (
        <CardWrapper content={false} onClick={onClick} sx={{ border: 1, borderColor: theme.palette.grey[900] + 25, borderRadius: 2 }}>
            <Box sx={{ height: '100%', p: 2.25 }}>
                <Grid container justifyContent='space-between' direction='column' sx={{ height: '100%', gap: 2.5 }}>
                    <Box display='flex' flexDirection='column' sx={{ width: '100%' }}>
                        <div
                            style={{
                                width: '100%',
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'center',
                                overflow: 'hidden'
                            }}
                        >
                            {data.iconSrc ? (
                                <div
                                    style={{
                                        width: 35,
                                        height: 35,
                                        display: 'flex',
                                        flexShrink: 0,
                                        marginRight: 10,
                                        borderRadius: '50%',
                                        backgroundImage: `url(${data.iconSrc})`,
                                        backgroundSize: 'contain',
                                        backgroundRepeat: 'no-repeat',
                                        backgroundPosition: 'center center'
                                    }}
                                />
                            ) : (
                                <div
                                    style={{
                                        width: 35,
                                        height: 35,
                                        display: 'flex',
                                        flexShrink: 0,
                                        marginRight: 10,
                                        borderRadius: '50%',
                                        background: color,
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    <IconBook2 size={20} color='white' />
                                </div>
                            )}
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Typography
                                    sx={{
                                        display: '-webkit-box',
                                        fontSize: '1.2rem',
                                        fontWeight: 500,
                                        WebkitLineClamp: 1,
                                        WebkitBoxOrient: 'vertical',
                                        textOverflow: 'ellipsis',
                                        overflow: 'hidden'
                                    }}
                                >
                                    {data.name}
                                </Typography>
                            </Box>
                        </div>
                        {data.description && (
                            <span
                                style={{
                                    display: '-webkit-box',
                                    marginTop: 10,
                                    overflowWrap: 'break-word',
                                    WebkitLineClamp: 3,
                                    WebkitBoxOrient: 'vertical',
                                    textOverflow: 'ellipsis',
                                    overflow: 'hidden'
                                }}
                            >
                                {data.description}
                            </span>
                        )}
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Chip
                            size='small'
                            icon={<IconFileText size={14} />}
                            label={`${fileCount} ${fileCount === 1 ? 'file' : 'files'}`}
                            variant='outlined'
                        />
                        {hasPublished ? (
                            <Chip size='small' icon={<IconUpload size={14} />} label='Published' color='success' variant='outlined' />
                        ) : (
                            <Chip size='small' label='Draft' variant='outlined' />
                        )}
                    </Box>
                </Grid>
            </Box>
        </CardWrapper>
    )
}

SkillCard.propTypes = {
    data: PropTypes.object.isRequired,
    onClick: PropTypes.func
}

export default SkillCard
