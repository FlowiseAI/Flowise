import * as React from 'react'
import PropTypes from 'prop-types'
import { Input as BaseInput } from '@mui/base'
import { TextareaAutosize } from '@mui/base/TextareaAutosize'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// Moved border and background styles to wrapper variant
const wrapperVariants = cva(
    'flex relative rounded-md border border-input bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
    {
        variants: {
            variant: {
                outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
                secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            },
            size: {
                default: 'min-h-10',
                sm: 'min-h-9',
                lg: 'min-h-11'
            }
        },
        defaultVariants: {
            size: 'default'
        }
    }
)

// Input variants without border and background styles
const inputVariants = cva(
    'w-full bg-transparent px-3 py-2 text-base placeholder:text-muted-foreground file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none disabled:cursor-not-allowed md:text-sm',
    {
        variants: {
            variant: {
                outline: 'text-foreground',
                secondary: 'text-secondary-foreground'
            }
        },
        defaultVariants: {
            variant: 'outline'
        }
    }
)

const Input = React.forwardRef(
    (
        {
            autoFocus = false,
            className,
            wrapperClassName,
            multiline = false,
            minRows = 1,
            maxRows,
            size = 'default',
            type,
            variant = 'outline',
            startAdornment,
            endAdornment,
            shortcut,
            disabled,
            ...props
        },
        ref
    ) => {
        const baseInputClassName = cn(inputVariants({ variant }), className)
        const baseWrapperClassName = cn(wrapperVariants({ variant, size }), disabled && 'opacity-50', wrapperClassName)

        const renderShortcut = shortcut && (
            <kbd className='pointer-events-none absolute right-[0.3rem] top-[50%] -translate-y-[50%] hidden h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex'>
                {shortcut}
            </kbd>
        )

        const combinedEndAdornment = (
            <>
                {endAdornment}
                {renderShortcut}
            </>
        )

        if (multiline) {
            return (
                <div className={baseWrapperClassName}>
                    {startAdornment && <div className='flex items-center pl-3'>{startAdornment}</div>}
                    <TextareaAutosize
                        ref={ref}
                        // eslint-disable-next-line jsx-a11y/no-autofocus
                        autoFocus={autoFocus}
                        minRows={minRows}
                        maxRows={maxRows}
                        disabled={disabled}
                        className={cn(baseInputClassName, 'resize-none')}
                        {...props}
                    />
                    {(endAdornment || shortcut) && (
                        <div className='flex items-center pr-3'>
                            {endAdornment}
                            {renderShortcut}
                        </div>
                    )}
                </div>
            )
        }

        return (
            <BaseInput
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus={autoFocus}
                className={baseWrapperClassName}
                ref={ref}
                type={type}
                disabled={disabled}
                startAdornment={startAdornment && <div className='flex items-center pl-3'>{startAdornment}</div>}
                endAdornment={(endAdornment || shortcut) && <div className='flex items-center pr-3'>{combinedEndAdornment}</div>}
                slotProps={{
                    input: {
                        className: baseInputClassName
                    }
                }}
                {...props}
            />
        )
    }
)

Input.displayName = 'Input'

Input.propTypes = {
    ...BaseInput.propTypes,
    shortcut: PropTypes.string,
    size: PropTypes.oneOf(['default', 'sm', 'lg']),
    multiline: PropTypes.bool,
    minRows: PropTypes.number,
    maxRows: PropTypes.number,
    variant: PropTypes.oneOf(['outline', 'secondary']),
    className: PropTypes.string,
    wrapperClassName: PropTypes.string,
    type: PropTypes.string,
    autoFocus: PropTypes.bool,
    startAdornment: PropTypes.node,
    endAdornment: PropTypes.node,
    disabled: PropTypes.bool
}

export { Input }
