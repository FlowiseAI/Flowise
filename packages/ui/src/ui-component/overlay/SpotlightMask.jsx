import PropTypes from 'prop-types'

// SVG spotlight mask with hole cutout
export const SpotlightMask = ({ rect, padding = 8 }) => {
    const x = rect.x - padding
    const y = rect.y - padding
    const w = rect.width + padding * 2
    const h = rect.height + padding * 2

    return (
        <svg
            style={{
                position: 'fixed',
                inset: 0,
                width: '100vw',
                height: '100vh',
                pointerEvents: 'none',
                zIndex: 9998
            }}
        >
            <defs>
                <mask id='spotlight-mask'>
                    <rect width='100%' height='100%' fill='white' />
                    <rect x={x} y={y} width={w} height={h} rx={12} ry={12} fill='black' />
                </mask>
            </defs>

            <rect width='100%' height='100%' fill='rgba(0,0,0,0.65)' mask='url(#spotlight-mask)' />
        </svg>
    )
}

SpotlightMask.propTypes = {
    rect: PropTypes.shape({
        x: PropTypes.number.isRequired,
        y: PropTypes.number.isRequired,
        width: PropTypes.number.isRequired,
        height: PropTypes.number.isRequired
    }).isRequired,
    padding: PropTypes.number
}
