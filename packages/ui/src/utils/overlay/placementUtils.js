// Auto placement engine for tooltips

export function resolvePlacement(rect, tooltipW, tooltipH, preferred = 'bottom') {
    // Calculate available space in each direction
    const space = {
        top: rect.top,
        bottom: window.innerHeight - rect.bottom,
        left: rect.left,
        right: window.innerWidth - rect.right
    }

    // Check if tooltip fits in each direction (with 20px margin)
    const margin = 20
    const fits = {
        top: space.top > tooltipH + margin,
        bottom: space.bottom > tooltipH + margin,
        left: space.left > tooltipW + margin,
        right: space.right > tooltipW + margin,
        'top-left': space.top > tooltipH + margin && space.left > tooltipW + margin,
        'top-right': space.top > tooltipH + margin && space.right > tooltipW + margin,
        'bottom-left': space.bottom > tooltipH + margin && space.left > tooltipW + margin,
        'bottom-right': space.bottom > tooltipH + margin && space.right > tooltipW + margin
    }

    // If preferred placement fits, use it
    if (fits[preferred]) return preferred

    // Detect if target is in a corner region (within 30% of screen edges)
    const isNearTop = rect.top < window.innerHeight * 0.3
    const isNearBottom = rect.bottom > window.innerHeight * 0.7
    const isNearLeft = rect.left < window.innerWidth * 0.3
    const isNearRight = rect.right > window.innerWidth * 0.7

    // Prefer corner placements when target is near corners
    if (isNearBottom && isNearRight && fits['top-left']) return 'top-left'
    if (isNearBottom && isNearLeft && fits['top-right']) return 'top-right'
    if (isNearTop && isNearRight && fits['bottom-left']) return 'bottom-left'
    if (isNearTop && isNearLeft && fits['bottom-right']) return 'bottom-right'

    // Otherwise find best fit (prioritize standard placements first)
    const order = ['bottom', 'top', 'right', 'left', 'bottom-right', 'bottom-left', 'top-right', 'top-left']
    return order.find((p) => fits[p]) || 'bottom'
}
