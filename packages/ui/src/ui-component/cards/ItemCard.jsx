import PropTypes from 'prop-types'
import { useSelector } from 'react-redux'

// material-ui
import { styled, useTheme } from '@mui/material/styles'
import { Box, Grid, Typography } from '@mui/material'

// project imports
import MainCard from '@/ui-component/cards/MainCard'

const CardWrapper = styled(MainCard)(({ theme }) => ({
  background: theme.palette.background.paper,
  color: theme.palette.text.primary,
  overflow: 'auto',
  position: 'relative',
  boxShadow: theme.shadows[3],
  cursor: 'pointer',
  '&:hover': {
    background: theme.palette.action.hover,
    boxShadow: theme.shadows[6]
  },
  height: '100%',
  minHeight: '120px',
  maxHeight: '300px',
  width: '100%',
  overflowWrap: 'break-word',
  whiteSpace: 'pre-line',
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.divider}`,
  padding: '0px !important'
}))

const ItemCard = ({ data, images, onClick }) => {
  const theme = useTheme()
  const customization = useSelector((state) => state.customization)

  return (
    <CardWrapper onClick={onClick}>
      <Box sx={{ height: '100%', pt: 2 }}>
        <Grid container direction='column' sx={{ height: '100%', gap: 1.5 }}>
          <Box display='flex' flexDirection='column' sx={{ width: '100%' }}>
            <Box display='flex' alignItems='center' sx={{ mb: 1.5 }}>
              {data.iconSrc ? (
                <Box
                  component='img'
                  src={data.iconSrc}
                  alt='icon'
                  sx={{
                    width: 35,
                    height: 35,
                    borderRadius: '50%',
                    mr: 1.5,
                    objectFit: 'contain'
                  }}
                />
              ) : (
                data.color && (
                  <Box
                    sx={{
                      width: 35,
                      height: 35,
                      borderRadius: '50%',
                      mr: 1.5,
                      backgroundColor: data.color
                    }}
                  />
                )
              )}
              <Typography
                variant='h6'
                sx={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  fontSize: '20px'
                }}
              >
                {data.templateName || data.name}
              </Typography>
            </Box>
            {data.description && (
              <Typography
                variant='body2'
                sx={{
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  mb: 1.5
                }}
              >
                {data.description}
              </Typography>
            )}
            {data?.user?.username && (
              <Typography variant='body2' sx={{ mb: 0.5 }}>
                User: {data.user.username}
              </Typography>
            )}
            {(data?.user?.groupname || data?.groupname) && (
              <Typography variant='body2'>Group: {data.user?.groupname || data.groupname}</Typography>
            )}
          </Box>
          {images && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              {images.slice(0, 3).map((img, index) => (
                <Box
                  key={index}
                  sx={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    backgroundColor: customization.isDarkMode ? theme.palette.common.white : theme.palette.grey[300]
                  }}
                >
                  <Box
                    component='img'
                    src={img}
                    alt=''
                    sx={{
                      width: '100%',
                      height: '100%',
                      padding: 0.5,
                      objectFit: 'contain'
                    }}
                  />
                </Box>
              ))}
              {images.length > 3 && <Typography variant='body2'>+ {images.length - 3} More</Typography>}
            </Box>
          )}
        </Grid>
      </Box>
    </CardWrapper>
  )
}

ItemCard.propTypes = {
  data: PropTypes.object.isRequired,
  images: PropTypes.array,
  onClick: PropTypes.func
}

export default ItemCard
