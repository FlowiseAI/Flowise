import PropTypes from 'prop-types'
import { useSelector } from 'react-redux'

// material-ui
import { Box, Typography, useTheme } from '@mui/material'
import { IconVectorBezier2, IconLanguage, IconScissors } from '@tabler/icons-react'

// components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// project imports
import DocumentStoreStatus from '@/views/docstore/DocumentStoreStatus'

import { kFormatter } from '@/utils/genericHelper'
import { Badge } from '@/components/ui/badge'

// ===========================|| DOC STORE CARD ||=========================== //

const DocumentStoreCard = ({ data, images, onClick }) => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)

    return (
        <Card className='h-full cursor-pointer duration-200 transition-shadow hover:shadow-lg' onClick={onClick}>
            <CardHeader>
                <CardTitle className='flex flex-row items-center justify-between text-xl font-semibold'>
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
                </CardTitle>
                {data.description && (
                    <CardDescription
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
                    </CardDescription>
                )}
            </CardHeader>
            <CardContent className='flex flex-col gap-2'>
                <Box className='flex items-center gap-2'>
                    <Badge variant='outline'>
                        <IconVectorBezier2 style={{ marginRight: 5 }} size={15} />
                        {data.whereUsed?.length ?? 0} {data.whereUsed?.length <= 1 ? 'flow' : 'flows'}
                    </Badge>
                    <Badge variant='outline'>
                        <IconLanguage style={{ marginRight: 5 }} size={15} />
                        {kFormatter(data.totalChars ?? 0)} chars
                    </Badge>
                    <Badge variant='outline'>
                        <IconScissors style={{ marginRight: 5 }} size={15} />
                        {kFormatter(data.totalChunks ?? 0)} chunks
                    </Badge>
                </Box>
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
                                    backgroundColor: customization.isDarkMode ? theme.palette.common.white : theme.palette.grey[300] + 75
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
            </CardContent>
        </Card>
    )
}

DocumentStoreCard.propTypes = {
    data: PropTypes.object,
    images: PropTypes.array,
    onClick: PropTypes.func
}

export default DocumentStoreCard
