import * as React from 'react'
import PropTypes from 'prop-types'
import { useSelector } from 'react-redux'
import { ClickAwayListener } from '@mui/base/ClickAwayListener'
import { Select as BaseSelect } from '@mui/base/Select'
import { Option as BaseOption } from '@mui/base/Option'
import { OptionGroup as BaseOptionGroup } from '@mui/base/OptionGroup'
import { IconCheck, IconChevronDown } from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import { Button } from './button'

const Select = React.forwardRef(function CustomSelect(
    { className, children, value, defaultValue, onValueChange, placeholder = 'Select an option', size = 'default', ...props },
    ref
) {
    const customization = useSelector((state) => state.customization)
    const [open, setOpen] = React.useState(false)
    const triggerRef = React.useRef(null)
    const [triggerWidth, setTriggerWidth] = React.useState('auto')

    const handleChange = (event, newValue) => {
        onValueChange?.(newValue)
        setOpen(false)
    }

    React.useEffect(() => {
        if (triggerRef.current) {
            setTriggerWidth(`${triggerRef.current.offsetWidth}px`)
        }
    }, [])

    return (
        <ClickAwayListener onClickAway={() => setOpen(false)}>
            <div className={cn('relative', className)}>
                <BaseSelect
                    ref={ref}
                    value={value}
                    defaultValue={defaultValue}
                    onChange={handleChange}
                    {...props}
                    open={open}
                    onOpenChange={(isOpen) => setOpen(isOpen)}
                    slots={{
                        root: SelectTrigger
                    }}
                    slotProps={{
                        root: () => ({
                            placeholder,
                            size,
                            ref: triggerRef
                        }),
                        listbox: () => ({
                            className: cn(
                                customization.isDarkMode ? 'dark' : '',
                                'relative z-50 my-2 overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 max-h-96 p-1'
                            ),
                            style: { width: triggerWidth }
                        }),
                        popup: () => ({
                            className: 'z-50',
                            modifiers: [
                                {
                                    name: 'offset',
                                    options: {
                                        offset: [0, 4]
                                    }
                                }
                            ]
                        })
                    }}
                    renderValue={(option) => option?.label || option?.value}
                    highlightedIndex={defaultValue || value ? undefined : -1}
                >
                    {children}
                </BaseSelect>
            </div>
        </ClickAwayListener>
    )
})
Select.propTypes = {
    className: PropTypes.string,
    children: PropTypes.node,
    value: PropTypes.any,
    defaultValue: PropTypes.any,
    onValueChange: PropTypes.func,
    placeholder: PropTypes.string,
    size: PropTypes.oneOf(['default', 'sm', 'lg'])
}

const SelectTrigger = React.forwardRef(function SelectTrigger(props, ref) {
    const { ownerState, className, placeholder, size = 'default', ...other } = props

    const displayValue = !ownerState.value ? (
        <span className='text-muted-foreground'>{placeholder}</span>
    ) : (
        ownerState.label || props.children || ownerState.value
    )

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

const SelectItem = React.forwardRef(({ children, ...props }, ref) => {
    return (
        <BaseOption
            ref={ref}
            {...props}
            slots={{
                root: SelectItemRoot
            }}
        >
            {children}
        </BaseOption>
    )
})
SelectItem.displayName = 'Option'
SelectItem.propTypes = {
    children: PropTypes.node
}

const SelectItemRoot = React.forwardRef(({ className, children, ownerState, ...props }, ref) => {
    const { selected, disabled, highlighted } = ownerState || {}

    return (
        <li
            ref={ref}
            className={cn(
                'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none',
                'hover:bg-accent hover:text-accent-foreground',
                'focus:bg-accent focus:text-accent-foreground',
                'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                {
                    'bg-accent text-accent-foreground': highlighted && !selected,
                    'bg-accent/50 text-accent-foreground': selected && !highlighted,
                    'opacity-50 cursor-not-allowed': disabled
                },
                className
            )}
            {...props}
        >
            <span className='absolute top-0 left-2 flex h-full w-3.5 items-center justify-center'>
                {selected && <IconCheck className='h-4 w-4' />}
            </span>
            {children}
        </li>
    )
})
SelectItemRoot.propTypes = {
    className: PropTypes.string,
    children: PropTypes.node,
    ownerState: PropTypes.shape({
        selected: PropTypes.bool,
        disabled: PropTypes.bool,
        highlighted: PropTypes.bool
    })
}
SelectItemRoot.displayName = 'SelectItemRoot'

const SelectGroup = React.forwardRef(({ className, children, ...props }, ref) => {
    return (
        <BaseOptionGroup
            ref={ref}
            {...props}
            slots={{
                root: SelectGroupRoot,
                label: SelectGroupLabel
            }}
            className={className}
        >
            {children}
        </BaseOptionGroup>
    )
})
SelectGroup.propTypes = {
    className: PropTypes.string,
    children: PropTypes.node
}
SelectGroup.displayName = 'SelectGroup'

const SelectGroupRoot = React.forwardRef(({ className, children, ...props }, ref) => {
    return (
        <li ref={ref} className={cn('p-1 w-full', className)} {...props}>
            {children}
        </li>
    )
})
SelectGroupRoot.propTypes = {
    className: PropTypes.string,
    children: PropTypes.node
}
SelectGroupRoot.displayName = 'SelectGroupRoot'

const SelectGroupLabel = React.forwardRef(({ className, children, ...props }, ref) => {
    return (
        <span
            ref={ref}
            className={cn(
                'flex w-full cursor-default select-none items-center py-1.5 pl-8 pr-2 text-sm outline-none font-semibold',
                className
            )}
            {...props}
        >
            {children}
        </span>
    )
})
SelectGroupLabel.propTypes = {
    className: PropTypes.string,
    children: PropTypes.node
}
SelectGroupLabel.displayName = 'SelectGroupLabel'

export { Select, SelectGroup, SelectItem }
