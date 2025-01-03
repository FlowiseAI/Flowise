import * as React from 'react'
import PropTypes from 'prop-types'
import {
    Card as MUICard,
    CardContent as MUICardContent,
    CardHeader as MUICardHeader,
    CardMedia as MUICardMedia,
    CardActions as MUICardActions
} from '@mui/material'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const cardVariants = cva(
    'flex flex-col rounded-lg border bg-card text-card-foreground shadow-sm transition-shadow duration-200 hover:shadow-md',
    {
        variants: {
            variant: {
                default: '',
                outline: 'border-2',
                ghost: 'border-none shadow-none'
            }
        },
        defaultVariants: {
            variant: 'default'
        }
    }
)

const cardHeaderVariants = cva('flex flex-col items-start flex-1 space-y-1.5 p-4', {
    variants: {
        spacing: {
            default: '',
            compact: 'p-4',
            loose: 'p-8'
        }
    },
    defaultVariants: {
        spacing: 'default'
    }
})

const cardContentVariants = cva('!p-4 !pt-0', {
    variants: {
        spacing: {
            default: '',
            compact: '!p-4 !pt-0',
            loose: '!p-6 !pt-0'
        }
    },
    defaultVariants: {
        spacing: 'default'
    }
})

const cardActionsVariants = cva('flex items-center p-6 pt-0', {
    variants: {
        align: {
            start: 'justify-start',
            center: 'justify-center',
            end: 'justify-end',
            between: 'justify-between'
        },
        spacing: {
            default: '',
            compact: 'p-4 pt-0',
            loose: 'p-6 pt-0'
        }
    },
    defaultVariants: {
        align: 'start',
        spacing: 'default'
    }
})

// Card component
const Card = React.forwardRef(({ className, variant, ...props }, ref) => (
    <MUICard ref={ref} className={cn(cardVariants({ variant }), className)} {...props} />
))
Card.displayName = 'Card'
Card.propTypes = {
    className: PropTypes.string,
    variant: PropTypes.oneOf(['default', 'outline', 'ghost'])
}

// CardHeader component
const CardHeader = React.forwardRef(({ className, title, subheader, spacing, ...props }, ref) => (
    <MUICardHeader
        ref={ref}
        className={cn(cardHeaderVariants({ spacing }), className)}
        title={title}
        subheader={subheader && <div className='text-sm text-muted-foreground'>{subheader}</div>}
        // FIXME: changing font size here doesn't seem to do anything
        classes={{ title: 'text-lg font-semibold leading-none tracking-tight' }}
        {...props}
    />
))
CardHeader.displayName = 'CardHeader'
CardHeader.propTypes = {
    className: PropTypes.string,
    spacing: PropTypes.oneOf(['default', 'compact', 'loose']),
    subheader: PropTypes.string,
    title: PropTypes.string
}

// CardContent component
const CardContent = React.forwardRef(({ className, spacing, ...props }, ref) => (
    <MUICardContent ref={ref} className={cn(cardContentVariants({ spacing }), className)} {...props} />
))
CardContent.displayName = 'CardContent'
CardContent.propTypes = {
    className: PropTypes.string,
    spacing: PropTypes.oneOf(['default', 'compact', 'loose'])
}

// CardMedia component
const CardMedia = React.forwardRef(({ className, ...props }, ref) => <MUICardMedia ref={ref} className={cn(className)} {...props} />)
CardMedia.displayName = 'CardMedia'
CardMedia.propTypes = {
    className: PropTypes.string
}

// CardActions component
const CardActions = React.forwardRef(({ className, align, spacing, ...props }, ref) => (
    <MUICardActions ref={ref} className={cn(cardActionsVariants({ align, spacing }), className)} {...props} />
))
CardActions.displayName = 'CardActions'
CardActions.propTypes = {
    align: PropTypes.oneOf(['start', 'center', 'end', 'between']),
    className: PropTypes.string,
    spacing: PropTypes.oneOf(['default', 'compact', 'loose'])
}

export { Card, CardHeader, CardContent, CardMedia, CardActions }
