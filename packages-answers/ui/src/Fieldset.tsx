import Box from '@mui/material/Box'

const fieldsetStyles = {
    borderRadius: 1.5,
    textAlign: 'left',
    margin: 0,
    borderStyle: 'solid',
    borderWidth: '1px',
    minWidth: '0%',
    paddingRight: 0.25,
    paddingLeft: 0.5,
    pt: 0.25,
    pb: 1.25,
    position: 'relative',
    borderColor: 'rgba(255, 255, 255, .23)',

    '& *': {
        border: 'none !important'
    }
}

const legendStyles = {
    color: '#9e9e9e',
    fontWeight: 400,
    fontSize: '.75rem',
    lineHeight: '1.4375em',
    px: 1,
    position: 'relative',
    display: 'block',
    maxWidth: 'calc(75%)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
}

const Fieldset = ({ legend, children, sx, ...other }: { legend?: string; children?: any; sx?: Record<string, any> }) => {
    return (
        <Box component='fieldset' {...other} sx={{ ...fieldsetStyles, ...sx }}>
            {legend && (
                <Box component='legend' sx={legendStyles}>
                    {legend}
                </Box>
            )}
            {children}
        </Box>
    )
}

export default Fieldset
