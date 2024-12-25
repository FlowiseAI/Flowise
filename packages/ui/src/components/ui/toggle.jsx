import * as React from 'react'
import PropTypes from 'prop-types'
import { Button } from './button'
import { cva } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const toggleVariants = cva(
    'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
    {
        variants: {
            variant: {
                default: 'bg-transparent',
                outline: 'border border-input bg-transparent hover:bg-accent hover:text-accent-foreground'
            },
            size: {
                default: 'h-10 px-3 min-w-10',
                sm: 'h-9 px-2.5 min-w-9',
                lg: 'h-11 px-5 min-w-11'
            }
        },
        defaultVariants: {
            variant: 'default',
            size: 'default'
        }
    }
)

const Toggle = React.forwardRef(({ className, variant, size, ...props }, ref) => {
    const [pressed, setPressed] = React.useState(props.defaultPressed ?? false)

    React.useEffect(() => {
        if (typeof props.pressed !== 'undefined') {
            setPressed(props.pressed)
        }
    }, [props.pressed])

    const handleToggleChange = () => {
        setPressed(!pressed)
        props.onPressedChange?.(!pressed)
    }

    return (
        <Button
            ref={ref}
            className={cn(toggleVariants({ variant, size, className }) + 'px-4 py-2 md:h-12 w-10')}
            aria-pressed={pressed}
            variant={pressed ? 'default' : 'outline'}
            disabled={props.disabled}
            onClick={handleToggleChange}
        />
    )
})

Toggle.displayName = 'Toggle'
Toggle.propTypes = {
    ...Button.propTypes,
    defaultPressed: PropTypes.bool,
    pressed: PropTypes.bool,
    onPressedChange: PropTypes.func,
    size: PropTypes.oneOf(['default', 'sm', 'lg']),
    variant: PropTypes.oneOf(['default', 'outline'])
}

export { Toggle, toggleVariants }
