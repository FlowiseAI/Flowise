import * as React from 'react'
import PropTypes from 'prop-types'
import { Input as BaseInput } from '@mui/base'
import { TextareaAutosize } from '@mui/base/TextareaAutosize'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const inputVariants = cva(
    'flex w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
    {
        variants: {
            variant: {
                outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
                secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            },
            size: {
                default: 'h-10',
                sm: 'h-9',
                lg: 'h-11'
            }
        },
        defaultVariants: {
            size: 'default'
        }
    }
)

const Input = React.forwardRef(
    (
        { autoFocus = true, className, multiline = false, minRows = 1, maxRows, size = 'default', type, variant = 'outline', ...props },
        ref
    ) => {
        // Base className configuration
        const baseClassName = cn(inputVariants({ variant, size, className }), multiline && 'h-auto min-h-[80px]')

        if (multiline) {
            return (
                <div className='relative'>
                    <TextareaAutosize
                        ref={ref}
                        // eslint-disable-next-line jsx-a11y/no-autofocus
                        autoFocus={autoFocus}
                        minRows={minRows}
                        maxRows={maxRows}
                        className={cn(baseClassName, 'resize-none')}
                        {...props}
                    />
                    {props.shortcut && (
                        <kbd className='pointer-events-none absolute right-[0.5rem] top-[0.5rem] h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[12px] font-medium opacity-100'>
                            {props.shortcut}
                        </kbd>
                    )}
                </div>
            )
        }

        return (
            <BaseInput
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus={autoFocus}
                className='flex items-center relative'
                ref={ref}
                type={type}
                slotProps={{
                    input: {
                        className: baseClassName
                    }
                }}
                endAdornment={
                    props.shortcut ? (
                        <kbd className='pointer-events-none absolute right-[0.5rem] top-[50%] translate-y-[-50%] h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[12px] font-medium opacity-100'>
                            {props.shortcut}
                        </kbd>
                    ) : null
                }
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
    type: PropTypes.string,
    autoFocus: PropTypes.bool
}

export { Input }
