import * as React from 'react'
import PropTypes from 'prop-types'
import { Button } from './button'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const ToggleGroupContext = React.createContext({
    size: 'default',
    variant: 'default',
    type: 'single',
    value: undefined,
    onValueChange: () => {}
})

const toggleGroupVariants = cva('flex items-center justify-center gap-1', {
    variants: {
        // variant: {
        //     default: 'bg-transparent',
        //     outline: 'border border-input bg-transparent hover:bg-accent hover:text-accent-foreground'
        // },
        size: {
            default: 'h-10',
            sm: 'h-9',
            lg: 'h-11'
        }
    },
    defaultVariants: {
        // variant: 'default',
        size: 'default'
    }
})

const ToggleGroup = React.forwardRef(
    (
        { className, variant = 'default', size = 'default', type = 'single', value, defaultValue, onValueChange, children, ...props },
        ref
    ) => {
        const [selectedValue, setSelectedValue] = React.useState(defaultValue ?? value)

        React.useEffect(() => {
            if (typeof value !== 'undefined') {
                setSelectedValue(value)
            }
        }, [value])

        const handleValueChange = React.useCallback(
            (newValue) => {
                if (type === 'single') {
                    setSelectedValue(newValue)
                    onValueChange?.(newValue)
                } else if (type === 'multiple') {
                    const updatedValue = selectedValue ? [...selectedValue] : []
                    const valueIndex = updatedValue.indexOf(newValue)

                    if (valueIndex === -1) {
                        updatedValue.push(newValue)
                    } else {
                        updatedValue.splice(valueIndex, 1)
                    }

                    setSelectedValue(updatedValue)
                    onValueChange?.(updatedValue)
                }
            },
            [type, selectedValue, onValueChange]
        )

        return (
            <div ref={ref} className={cn(toggleGroupVariants({ size, className }))} role='group' {...props}>
                <ToggleGroupContext.Provider
                    value={{
                        size,
                        variant,
                        type,
                        value: selectedValue,
                        onValueChange: handleValueChange
                    }}
                >
                    {children}
                </ToggleGroupContext.Provider>
            </div>
        )
    }
)

ToggleGroup.displayName = 'ToggleGroup'
ToggleGroup.propTypes = {
    className: PropTypes.string,
    variant: PropTypes.oneOf(['default', 'ghost']),
    size: PropTypes.oneOf(['default', 'sm', 'lg']),
    type: PropTypes.oneOf(['single', 'multiple']),
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)]),
    defaultValue: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)]),
    onValueChange: PropTypes.func,
    disabled: PropTypes.bool,
    children: PropTypes.node
}

const ToggleGroupItem = React.forwardRef(({ className, children, value, disabled, size, ...props }, ref) => {
    const context = React.useContext(ToggleGroupContext)
    const isSelected = context.type === 'multiple' ? context.value?.includes(value) : context.value === value

    const handleClick = () => {
        if (!disabled) {
            context.onValueChange(value)
        }
    }

    return (
        <Button
            ref={ref}
            type='button'
            variant={isSelected ? 'default' : 'ghost'}
            size={context.size || size}
            className={cn('data-[state=on]:bg-accent data-[state=on]:text-accent-foreground', className)}
            disabled={disabled}
            onClick={handleClick}
            data-state={isSelected ? 'on' : 'off'}
            {...props}
        >
            {children}
        </Button>
    )
})

ToggleGroupItem.displayName = 'ToggleGroupItem'
ToggleGroupItem.propTypes = {
    className: PropTypes.string,
    children: PropTypes.node,
    value: PropTypes.string.isRequired,
    disabled: PropTypes.bool,
    variant: PropTypes.oneOf(['default', 'ghost']),
    size: PropTypes.oneOf(['default', 'sm', 'lg'])
}

export { ToggleGroup, ToggleGroupItem }
