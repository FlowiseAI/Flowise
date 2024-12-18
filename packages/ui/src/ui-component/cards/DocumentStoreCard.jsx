import PropTypes from 'prop-types'
import { useSelector } from 'react-redux'

// material-ui
import { styled } from '@mui/material/styles'
import { Box, Grid, Typography, useTheme } from '@mui/material'
import { IconVectorBezier2, IconLanguage, IconScissors } from '@tabler/icons-react'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import DocumentStoreStatus from '@/views/docstore/DocumentStoreStatus'

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

    return (
        <CardWrapper content={false} onClick={onClick} sx={{ border: 1, borderColor: theme.palette.grey[900] + 25, borderRadius: 2 }}>
            <Box sx={{ height: '100%', p: 2.25 }}>
                <Grid container justifyContent='space-between' direction='column' sx={{ height: '100%' }} gap={2}>
                    <Box display='flex' flexDirection='column' sx={{ flex: 1, width: '100%' }}>
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
                                    flex: 1,
                                    mr: 1
                                }}
                            >
                                {data.name}
                            </Typography>
                            <DocumentStoreStatus status={data.status} />
                        </div>
                        <span
                            style={{
                                display: '-webkit-box',
                                marginTop: 10,
                                overflowWrap: 'break-word',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                textOverflow: 'ellipsis',
                                overflow: 'hidden'
                            }}
                        >
                            {data.description || ' '}
                        </span>
                    </Box>
                    <Grid container columnGap={2} rowGap={1}>
                        <div
                            style={{
                                paddingLeft: '7px',
                                paddingRight: '7px',
                                paddingTop: '3px',
                                paddingBottom: '3px',
                                fontSize: '11px',
                                width: 'max-content',
                                borderRadius: '25px',
                                boxShadow: customization.isDarkMode
                                    ? '0 2px 14px 0 rgb(255 255 255 / 20%)'
                                    : '0 2px 14px 0 rgb(32 40 45 / 20%)',

                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'center'
                            }}
                        >
                            <IconVectorBezier2 style={{ marginRight: 5 }} size={15} />
                            {data.whereUsed?.length ?? 0} {data.whereUsed?.length <= 1 ? 'flow' : 'flows'}
                        </div>
                        <div
                            style={{
                                paddingLeft: '7px',
                                paddingRight: '7px',
                                paddingTop: '3px',
                                paddingBottom: '3px',
                                fontSize: '11px',
                                width: 'max-content',
                                borderRadius: '25px',
                                boxShadow: customization.isDarkMode
                                    ? '0 2px 14px 0 rgb(255 255 255 / 20%)'
                                    : '0 2px 14px 0 rgb(32 40 45 / 20%)',

                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'center'
                            }}
                        >
                            <IconLanguage style={{ marginRight: 5 }} size={15} />
                            {kFormatter(data.totalChars ?? 0)} chars
                        </div>
                        <div
                            style={{
                                paddingLeft: '7px',
                                paddingRight: '7px',
                                paddingTop: '3px',
                                paddingBottom: '3px',
                                fontSize: '11px',
                                width: 'max-content',
                                borderRadius: '25px',
                                boxShadow: customization.isDarkMode
                                    ? '0 2px 14px 0 rgb(255 255 255 / 20%)'
                                    : '0 2px 14px 0 rgb(32 40 45 / 20%)',
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'center'
                            }}
                        >
                            <IconScissors style={{ marginRight: 5 }} size={15} />
                            {kFormatter(data.totalChunks ?? 0)} chunks
                        </div>
                    </Grid>
                    {images && images.length > 0 && (
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
