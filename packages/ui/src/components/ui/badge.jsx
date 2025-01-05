import PropTypes from 'prop-types'
import { cva } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
    'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
    {
        variants: {
            variant: {
                default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
                secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
                destructive: 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
                outline: 'text-foreground'
            }
        },
        defaultVariants: {
            variant: 'default'
        }
    }
)

const Badge = ({ className, variant, ...props }) => {
    return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}
Badge.propTypes = {
    className: PropTypes.string,
    variant: PropTypes.oneOf(['default', 'secondary', 'destructive', 'outline'])
}

export { Badge, badgeVariants }
