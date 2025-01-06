import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar
} from '@/components/ui/sidebar'
import { Link, useLocation } from 'react-router-dom'

import items from '@/menu-items/dashboard'
import Logo from '@/ui-component/extended/Logo'
import { Badge } from '@/components/ui/badge'

export function AppSidebar() {
    const location = useLocation()
    const { state } = useSidebar()

    return (
        <Sidebar>
            <SidebarHeader className={`h-20 flex-row items-center justify-between ${state !== 'collapsed' ? 'px-4' : ''}`}>
                {state !== 'collapsed' && <Logo />}
            </SidebarHeader>
            <SidebarContent className={`${state !== 'collapsed' ? 'px-2' : ''}`}>
                {items.children.map((child, index) => (
                    <SidebarGroup key={index}>
                        {child.title && <SidebarGroupLabel>{child.title}</SidebarGroupLabel>}
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {child.children.map((item) => (
                                    <SidebarMenuItem className='h-10 flex items-center justify-between' key={item.title}>
                                        <SidebarMenuButton
                                            asChild
                                            className={`h-full ${state === 'collapsed' ? 'justify-center [&>span]:hidden' : ''}`}
                                            isActive={
                                                item.id === 'chatflows'
                                                    ? location.pathname === '/' || location.pathname === item.url
                                                    : location.pathname === item.url
                                            }
                                            tooltip={item.title}
                                        >
                                            <Link to={item.url}>
                                                <item.icon />
                                                <span className='flex-1'>{item.title}</span>
                                                {item.isBeta && <Badge>BETA</Badge>}
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                ))}
            </SidebarContent>
        </Sidebar>
    )
}
