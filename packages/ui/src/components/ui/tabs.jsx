import * as React from 'react'
import PropTypes from 'prop-types'
import { Tabs as BaseTabs } from '@mui/base/Tabs'
import { TabsList as BaseTabsList } from '@mui/base/TabsList'
import { TabPanel as BaseTabPanel } from '@mui/base/TabPanel'
import { Tab as BaseTab } from '@mui/base/Tab'

import { cn } from '@/lib/utils'

const resolveSlotProps = (fn, args) => (typeof fn === 'function' ? fn(args) : fn)

const Tabs = React.forwardRef((props, ref) => {
    return <BaseTabs {...props} ref={ref} />
})
Tabs.displayName = 'Tabs'

const TabsList = React.forwardRef(({ className, ...props }, ref) => (
    <BaseTabsList
        ref={ref}
        className={cn('inline-flex h-10 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground', className)}
        {...props}
    />
))
TabsList.displayName = 'TabsList'
TabsList.propTypes = {
    className: PropTypes.string
}

const TabsTrigger = React.forwardRef(({ className, selectedClassName = 'bg-background text-foreground shadow-sm', ...props }, ref) => {
    return (
        <BaseTab
            ref={ref}
            {...props}
            slotProps={{
                ...props.slotProps,
                root: (ownerState) => {
                    const resolvedSlotProps = resolveSlotProps(props.slotProps?.root, ownerState)
                    return {
                        ...resolvedSlotProps,
                        className: cn(
                            'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium ring-offset-background transition-all',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                            'disabled:pointer-events-none disabled:opacity-50',
                            'hover:bg-background/50 select-none cursor-pointer',
                            ownerState.selected && selectedClassName,
                            resolvedSlotProps?.className,
                            className
                        )
                    }
                }
            }}
        />
    )
})
TabsTrigger.displayName = 'TabsTrigger'
TabsTrigger.propTypes = {
    className: PropTypes.string,
    selectedClassName: PropTypes.string,
    slotProps: PropTypes.shape({
        root: PropTypes.oneOfType([PropTypes.func, PropTypes.object])
    })
}

const TabsContent = React.forwardRef(({ className, ...props }, ref) => (
    <BaseTabPanel
        ref={ref}
        className={cn(
            'mt-2 ring-offset-background',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'data-[selected=true]:block data-[selected=false]:hidden',
            className
        )}
        {...props}
    />
))
TabsContent.displayName = 'TabsContent'
TabsContent.propTypes = {
    className: PropTypes.string
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
