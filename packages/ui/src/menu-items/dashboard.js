// assets
import { IconHierarchy, IconBuildingStore, IconKey, IconTool, IconLock } from '@tabler/icons'

// constant
const icons = { IconHierarchy, IconBuildingStore, IconKey, IconTool, IconLock }

// ==============================|| DASHBOARD MENU ITEMS ||============================== //

const dashboard = {
    id: 'dashboard',
    title: '',
    type: 'group',
    children: [
        {
            id: 'chatflows',
            title: 'Чаты',
            type: 'item',
            url: '/chatflows',
            icon: icons.IconHierarchy,
            breadcrumbs: true
        },
        {
            id: 'marketplaces',
            title: 'Торговые площадки',
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
            id: 'credentials',
            title: 'Реквизиты для входа',
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
