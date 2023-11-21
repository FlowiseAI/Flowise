// assets
import { IconHierarchy, IconBuildingStore, IconKey, IconTool, IconLock, IconRobot } from '@tabler/icons'

// constant
const icons = { IconHierarchy, IconBuildingStore, IconKey, IconTool, IconLock, IconRobot }

// ==============================|| DASHBOARD MENU ITEMS ||============================== //

const dashboard = {
    id: 'dashboard',
    title: '',
    type: 'group',
    children: [
        {
            id: 'chatflows',
            title: 'Проекты',
            type: 'item',
            url: '/chatflows',
            icon: icons.IconHierarchy,
            breadcrumbs: true
        },
        {
            id: 'marketplaces',
            title: 'Marketplace',
            type: 'item',
            url: '/marketplaces',
            icon: icons.IconBuildingStore,
            breadcrumbs: true
        },
        {
            id: 'tools',
            title: 'Инструменты',
            type: 'item',
            url: '/tools',
            icon: icons.IconTool,
            breadcrumbs: true
        },
        {
            id: 'assistants',
            title: 'Ассистенты ',
            type: 'item',
            url: '/assistants',
            icon: icons.IconRobot,
            breadcrumbs: true
        },
        {
            id: 'credentials',
            title: 'Учетные данные',
            type: 'item',
            url: '/credentials',
            icon: icons.IconLock,
            breadcrumbs: true
        },
        {
            id: 'apikey',
            title: 'API-ключи',
            type: 'item',
            url: '/apikey',
            icon: icons.IconKey,
            breadcrumbs: true
        }
    ]
}

export default dashboard
