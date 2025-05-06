'use client'
import { styled } from '@mui/material/styles'
import MuiDrawer from '@mui/material/Drawer'
import closedMixin from './theme/closedMixin'
import openedMixin from './theme/openedMixin'

const drawerWidth = '45vw'

const Drawer = styled(MuiDrawer, {
    shouldForwardProp: (prop) => prop !== 'open'
})(({ theme, open }: { open: boolean }) => ({
    position: 'relative',
    width: drawerWidth,
    flexShrink: 0,
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',

    ...(open && {
        ...openedMixin({ theme, width: drawerWidth }),
        '& .MuiDrawer-paper': openedMixin({ theme, width: drawerWidth })
    }),

    ...(!open && {
        ...closedMixin({ theme, spacing: 0 }),
        '& .MuiDrawer-paper': closedMixin({ theme, spacing: 0 })
    })
}))
export interface DrawerProps {
    open: boolean
    children: React.ReactNode
}

export default Drawer
