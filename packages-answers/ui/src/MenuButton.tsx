import * as React from 'react'
import NextLink from 'next/link'

import Popper from '@mui/material/Popper'
import Grow from '@mui/material/Grow'
import ClickAwayListener from '@mui/material/ClickAwayListener'
import Paper from '@mui/material/Paper'
import MenuList from '@mui/material/MenuList'
import MenuItem from '@mui/material/MenuItem'
import ListItemText from '@mui/material/ListItemText'
import ListItemIcon from '@mui/material/ListItemIcon'

export default function IconMenu({
    children,
    actions = []
}: {
    actions?: {
        icon?: React.ReactNode
        text?: string
        onClick?: () => void
        href?: string
    }[]
    children: React.ComponentElement<any, any>
}) {
    const [open, setOpen] = React.useState(false)
    const anchorRef = React.useRef<HTMLButtonElement>(null)

    const handleToggle = () => {
        setOpen((prevOpen) => !prevOpen)
    }

    const handleClose = (event: Event | React.SyntheticEvent) => {
        if (anchorRef.current && anchorRef.current.contains(event.target as HTMLElement)) {
            return
        }

        setOpen(false)
    }

    function handleListKeyDown(event: React.KeyboardEvent) {
        if (event.key === 'Tab') {
            event.preventDefault()
            setOpen(false)
        } else if (event.key === 'Escape') {
            setOpen(false)
        }
    }

    // return focus to the button when we transitioned from !open -> open
    const prevOpen = React.useRef(open)
    React.useEffect(() => {
        if (prevOpen.current === true && open === false) {
            anchorRef.current!.focus()
        }

        prevOpen.current = open
    }, [open])
    if (!children) return null
    return (
        <>
            <Popper open={open} anchorEl={anchorRef.current} role={undefined} placement='bottom-start' disablePortal transition>
                {({ TransitionProps, placement }) => (
                    <Grow
                        {...TransitionProps}
                        style={{
                            transformOrigin: placement === 'bottom-start' ? 'left top' : 'left bottom'
                        }}
                    >
                        <Paper>
                            <ClickAwayListener onClickAway={handleClose}>
                                <MenuList
                                    autoFocusItem={open}
                                    id='composition-menu'
                                    aria-labelledby='composition-button'
                                    onKeyDown={handleListKeyDown}
                                >
                                    {actions.map((action) => (
                                        <MenuItem
                                            key={action.text}
                                            onClick={action.onClick}
                                            {...(action.href ? { href: action.href, component: NextLink, prefetch: false } : {})}
                                        >
                                            {action.icon ? <ListItemIcon>{action.icon} </ListItemIcon> : null}
                                            {action.text ? <ListItemText>{action.text}</ListItemText> : null}
                                        </MenuItem>
                                    ))}
                                </MenuList>
                            </ClickAwayListener>
                        </Paper>
                    </Grow>
                )}
            </Popper>
            {React.cloneElement(children, {
                ref: anchorRef,
                id: 'composition-button',
                'aria-controls': open ? 'composition-menu' : undefined,
                'aria-expanded': open ? 'true' : undefined,
                'aria-haspopup': 'true',
                onClick: handleToggle
            })}
        </>
    )
}
