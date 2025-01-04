import * as React from 'react'
import PropTypes from 'prop-types'
import { Select as BaseSelect } from '@mui/base/Select'
import { Option as BaseOption } from '@mui/base/Option'
import { IconChevronDown } from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import { Button } from './button'

const Option = React.forwardRef((props, ref) => {
    return (
        <BaseOption
            ref={ref}
            {...props}
            slotProps={{
                root: ({ selected, highlighted, disabled }) => ({
                    className: cn(
                        'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground',
                        {
                            'bg-accent text-accent-foreground': highlighted,
                            'bg-primary text-primary-foreground': selected,
                            'opacity-50 pointer-events-none': disabled
                        }
                    )
                })
            }}
        />
    )
})
Option.displayName = 'Option'

const SelectTrigger = React.forwardRef(function SelectTrigger(props, ref) {
    const { ownerState, className, placeholder, size = 'default', ...other } = props
    const displayValue = ownerState.value || <span className='text-muted-foreground'>{placeholder}</span>

    return (
        <Button
            ref={ref}
            variant='outline'
            size={size}
            role='combobox'
            type='button'
            {...other}
            className={cn('w-full justify-between', '[&>span]:line-clamp-1', 'focus-visible:ring-ring', className)}
        >
            {displayValue}
            <IconChevronDown className='h-4 w-4 shrink-0 opacity-50' />
        </Button>
    )
})

SelectTrigger.propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
    placeholder: PropTypes.string,
    size: PropTypes.oneOf(['default', 'sm', 'lg']),
    ownerState: PropTypes.object.isRequired
}
SelectTrigger.displayName = 'SelectTrigger'

const Select = React.forwardRef(function CustomSelect(
    { className, children, value, defaultValue, onValueChange, placeholder = 'Select an option', size = 'default', ...props },
    ref
) {
    const handleChange = (event, newValue) => {
        onValueChange?.(newValue)
    }

    return (
        <BaseSelect
            ref={ref}
            value={value}
            defaultValue={defaultValue}
            onChange={handleChange}
            {...props}
            slots={{
                root: SelectTrigger
            }}
            slotProps={{
                root: () => ({
                    className: cn(className),
                    placeholder,
                    size
                }),
                listbox: () => ({
                    className: cn(
                        'relative z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 max-h-96 p-1'
                    )
                }),
                popup: () => ({
                    className: 'z-50'
                })
            }}
        >
            {children}
        </BaseSelect>
    )
})
Select.propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
    placeholder: PropTypes.string,
    size: PropTypes.oneOf(['default', 'sm', 'lg']),
    value: PropTypes.any,
    defaultValue: PropTypes.any,
    onValueChange: PropTypes.func
}

export { Select, Option }
