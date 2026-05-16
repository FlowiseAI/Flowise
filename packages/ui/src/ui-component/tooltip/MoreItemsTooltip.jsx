import { Tooltip, Typography } from '@mui/material'
import { styled } from '@mui/material/styles'
import PropTypes from 'prop-types'

const StyledUl = styled('ul')(() => ({
    paddingLeft: 20,
    margin: 0
}))

const StyledLi = styled('li')(() => ({
    paddingBottom: 4
}))

const MoreItemsTooltip = ({ images, children }) => {
    if (!images || images.length === 0) return children

    return (
        <Tooltip
            title={
                <StyledUl>
                    {images.map((img) => (
                        <StyledLi key={img.imageSrc || img.label}>
                            <Typography>{img.label}</Typography>
                        </StyledLi>
                    ))}
                </StyledUl>
            }
            placement='top'
        >
            {children}
        </Tooltip>
    )
}

export default MoreItemsTooltip

MoreItemsTooltip.propTypes = {
    images: PropTypes.array,
    children: PropTypes.node
}
