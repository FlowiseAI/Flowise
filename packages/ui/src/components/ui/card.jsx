import * as React from 'react'
import PropTypes from 'prop-types'

import { cn } from '@/lib/utils'

const Card = React.forwardRef(({ className, ...props }, ref) => (
    <div ref={ref} className={cn('rounded-lg border bg-card text-card-foreground shadow-sm', className)} {...props} />
))
Card.displayName = 'Card'
Card.propTypes = {
    className: PropTypes.string
}

const CardHeader = React.forwardRef(({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
))
CardHeader.displayName = 'CardHeader'
CardHeader.propTypes = {
    className: PropTypes.string
}

const CardTitle = React.forwardRef(({ className, ...props }, ref) => (
    <div ref={ref} className={cn('text-2xl font-semibold leading-none tracking-tight', className)} {...props} />
))
CardTitle.displayName = 'CardTitle'
CardTitle.propTypes = {
    className: PropTypes.string
}

const CardDescription = React.forwardRef(({ className, ...props }, ref) => (
    <div ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
))
CardDescription.displayName = 'CardDescription'
CardDescription.propTypes = {
    className: PropTypes.string
}

const CardContent = React.forwardRef(({ className, ...props }, ref) => <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />)
CardContent.displayName = 'CardContent'
CardContent.propTypes = {
    className: PropTypes.string
}

const CardFooter = React.forwardRef(({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center p-6 pt-0', className)} {...props} />
))
CardFooter.displayName = 'CardFooter'
CardFooter.propTypes = {
    className: PropTypes.string
}

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
