import * as React from 'react'
import PropTypes from 'prop-types'
import { Switch as BaseSwitch } from '@mui/base/Switch'

const resolveSlotProps = (fn, args) => (typeof fn === 'function' ? fn(args) : fn)

const Switch = React.forwardRef(({ checked, defaultChecked, onChange, disabled, ...props }, ref) => {
    // Track internal state for uncontrolled component usage
    const [internalChecked, setInternalChecked] = React.useState(defaultChecked || false)

    // Determine if component is controlled or uncontrolled
    const isControlled = checked !== undefined
    const switchChecked = isControlled ? checked : internalChecked

    const handleChange = (event) => {
        // For uncontrolled component
        if (!isControlled) {
            setInternalChecked(event.target.checked)
        }
        // Call external onChange if provided
        if (onChange) {
            onChange(event.target.checked)
        }
    }

    return (
        <BaseSwitch
            ref={ref}
            checked={switchChecked}
            onChange={handleChange}
            disabled={disabled}
            {...props}
            slotProps={{
                ...props.slotProps,
                root: (ownerState) => {
                    const resolvedSlotProps = resolveSlotProps(props.slotProps?.root, ownerState)
                    return {
                        ...resolvedSlotProps,
                        className: `relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                            disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                        } ${ownerState.checked ? 'bg-primary' : 'bg-input'} ${resolvedSlotProps?.className || ''}`
                    }
                },
                input: (ownerState) => {
                    const resolvedSlotProps = resolveSlotProps(props.slotProps?.input, ownerState)
                    return {
                        ...resolvedSlotProps,
                        className: `h-full w-full cursor-inherit absolute opacity-0 z-10 cursor-pointer ${
                            resolvedSlotProps?.className || ''
                        }`
                    }
                },
                thumb: (ownerState) => {
                    const resolvedSlotProps = resolveSlotProps(props.slotProps?.thumb, ownerState)
                    return {
                        ...resolvedSlotProps,
                        className: `pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${
                            ownerState.checked ? 'translate-x-5' : 'translate-x-0'
                        } ${resolvedSlotProps?.className || ''}`
                    }
                },
                track: (ownerState) => {
                    const resolvedSlotProps = resolveSlotProps(props.slotProps?.track, ownerState)
                    return {
                        ...resolvedSlotProps,
                        className: `absolute inset-0 ${resolvedSlotProps?.className || ''}`
                    }
                }
            }}
        />
    )
})

Switch.displayName = 'Switch'
Switch.propTypes = {
    checked: PropTypes.bool,
    defaultChecked: PropTypes.bool,
    disabled: PropTypes.bool,
    onChange: PropTypes.func,
    slotProps: PropTypes.shape({
        input: PropTypes.oneOfType([PropTypes.func, PropTypes.object]),
        root: PropTypes.oneOfType([PropTypes.func, PropTypes.object]),
        thumb: PropTypes.oneOfType([PropTypes.func, PropTypes.object]),
        track: PropTypes.oneOfType([PropTypes.func, PropTypes.object])
    })
}

export { Switch }
