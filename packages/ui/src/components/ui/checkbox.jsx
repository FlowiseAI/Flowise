import * as React from 'react'
import PropTypes from 'prop-types'
import { Checkbox as MUICheckbox } from '@mui/material'
import { IconCheck } from '@tabler/icons-react'
import { cn } from '@/lib/utils'

const Checkbox = React.forwardRef(({ className, ...props }, ref) => {
    return (
        <MUICheckbox
            ref={ref}
            icon={<span className='h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background' />}
            checkedIcon={
                <span className='h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background bg-primary text-primary-foreground flex items-center justify-center'>
                    <IconCheck className='h-4 w-4' />
                </span>
            }
            className={cn(
                'p-0 hover:bg-transparent data-[state=checked]:bg-primary',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                'disabled:cursor-not-allowed disabled:opacity-50',
                className
            )}
            {...props}
        />
    )
})

Checkbox.propTypes = {
    checked: PropTypes.bool,
    disabled: PropTypes.bool,
    id: PropTypes.string,
    required: PropTypes.bool,
    name: PropTypes.string,
    value: PropTypes.string,
    className: PropTypes.string,
    onChange: PropTypes.func,
    indeterminate: PropTypes.bool,
    size: PropTypes.oneOf(['small', 'medium', 'large']),
    labelPlacement: PropTypes.oneOf(['end', 'start', 'top', 'bottom'])
}

Checkbox.displayName = 'Checkbox'

export { Checkbox }
