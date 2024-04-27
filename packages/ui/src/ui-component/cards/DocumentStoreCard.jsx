import PropTypes from 'prop-types'
import { useSelector } from 'react-redux'

// material-ui
import { styled } from '@mui/material/styles'
import { Box, Grid, Typography, useTheme } from '@mui/material'
import { IconFiles, IconLanguage, IconScissors } from '@tabler/icons'

// project imports
import MainCard from '@/ui-component/cards/MainCard'

import { kFormatter } from '@/utils/genericHelper'

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

// ===========================|| DOC STORE CARD ||=========================== //

const DocumentStoreCard = ({ data, images, onClick }) => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)

    const getColor = (status) => {
        switch (status) {
            case 'STALE':
                return customization.isDarkMode
                    ? [theme.palette.grey[400], theme.palette.grey[600], theme.palette.grey[700]]
                    : [theme.palette.grey[300], theme.palette.grey[500], theme.palette.grey[700]]
            case 'EMPTY':
                return ['#673ab7', '#673ab7', '#673ab7']
            case 'SYNCING':
                return ['#fff8e1', '#ffe57f', '#ffc107']
            case 'SYNC':
                return ['#cdf5d8', '#00e676', '#00c853']
            case 'NEW':
                return ['#e3f2fd', '#2196f3', '#1e88e5']
            default:
                return customization.isDarkMode
                    ? [theme.palette.grey[300], theme.palette.grey[500], theme.palette.grey[700]]
                    : [theme.palette.grey[300], theme.palette.grey[500], theme.palette.grey[700]]
        }
    }

    return (
        <CardWrapper content={false} onClick={onClick} sx={{ border: 1, borderColor: theme.palette.grey[900] + 25, borderRadius: 2 }}>
            <Box sx={{ height: '100%', p: 2.25 }}>
                <Grid container justifyContent='space-between' direction='column' sx={{ height: '100%', gap: 3 }}>
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
                            <Typography
                                sx={{
                                    display: '-webkit-box',
                                    fontSize: '1.25rem',
                                    fontWeight: 500,
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    textOverflow: 'ellipsis',
                                    overflow: 'hidden',
                                    flex: 1
                                }}
                            >
                                {data.name}
                            </Typography>
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    alignContent: 'center',
                                    alignItems: 'center',
                                    background: data.status === 'EMPTY' ? 'transparent' : getColor(data.status)[0],
                                    border: data.status === 'EMPTY' ? '1px solid' : 'none',
                                    borderColor: data.status === 'EMPTY' ? getColor(data.status)[0] : 'transparent',
                                    borderRadius: 15,
                                    padding: 5,
                                    paddingLeft: 7,
                                    paddingRight: 7
                                }}
                            >
                                <div
                                    style={{
                                        width: 15,
                                        height: 15,
                                        borderRadius: '50%',
                                        backgroundColor: data.status === 'EMPTY' ? 'transparent' : getColor(data.status)[1],
                                        border: data.status === 'EMPTY' ? '3px solid' : 'none',
                                        borderColor: data.status === 'EMPTY' ? getColor(data.status)[1] : 'transparent'
                                    }}
                                />
                                <span style={{ color: getColor(data.status)[2], marginLeft: 5 }}>{data.status}</span>
                            </div>
                        </div>
                        {data.description && (
                            <span
                                style={{
                                    display: '-webkit-box',
                                    marginTop: 10,
                                    overflowWrap: 'break-word',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    textOverflow: 'ellipsis',
                                    overflow: 'hidden',
                                    marginBottom: 10
                                }}
                            >
                                {data.description}
                            </span>
                        )}
                        <div
                            style={{
                                width: '100%',
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'center',
                                alignContent: 'center',
                                overflow: 'hidden',
                                marginTop: 15
                            }}
                        >
                            <div style={{ marginRight: 15, display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                                <IconFiles size={20} />
                                {kFormatter(data.totalFiles ?? 0)} files
                            </div>
                            <div style={{ marginRight: 15, display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                                <IconLanguage size={20} />
                                {kFormatter(data.totalChars ?? 0)} chars
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                                <IconScissors size={20} />
                                {kFormatter(data.totalChunks ?? 0)} chunks
                            </div>
                        </div>
                    </Box>
                    {images && (
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'start',
                                gap: 1
                            }}
                        >
                            {images.slice(0, images.length > 3 ? 3 : images.length).map((img) => (
                                <Box
                                    key={img}
                                    sx={{
                                        width: 30,
                                        height: 30,
                                        borderRadius: '50%',
                                        backgroundColor: customization.isDarkMode
                                            ? theme.palette.common.white
                                            : theme.palette.grey[300] + 75
                                    }}
                                >
                                    <img style={{ width: '100%', height: '100%', padding: 5, objectFit: 'contain' }} alt='' src={img} />
                                </Box>
                            ))}
                            {images.length > 3 && (
                                <Typography sx={{ alignItems: 'center', display: 'flex', fontSize: '.9rem', fontWeight: 200 }}>
                                    + {images.length - 3} More
                                </Typography>
                            )}
                        </Box>
                    )}
                </Grid>
            </Box>
        </CardWrapper>
    )
}

DocumentStoreCard.propTypes = {
    data: PropTypes.object,
    images: PropTypes.array,
    onClick: PropTypes.func
}

export default DocumentStoreCard
