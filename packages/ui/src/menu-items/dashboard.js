// assets
import { IconHierarchy, IconBuildingStore, IconKey, IconTool, IconLock, IconRobot, IconTable, IconVariable } from '@tabler/icons'
// import IconKeys from '@/assets/images/IconKey.svg'
// import IconSmile from '@/assets/images/smile.svg'
// import IconCollection from '@/assets/images/collection.svg'
// import IconLocks from '@/assets/images/lock.svg'

// constant
const icons = {
    IconHierarchy,
    IconBuildingStore,
    IconKey,
    IconTool,
    IconLock,
    IconRobot,
    IconTable,
    IconVariable
}

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
            icon: icons.IconTable,
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
            icon: icons.IconHierarchy,
            breadcrumbs: true
        },
        {
            id: 'credentials',

            title: 'Учетные данные',
            type: 'item',
            url: '/credentials',
            icon: icons.IconHierarchy,
            breadcrumbs: true
        },
        {
            id: 'variables',
            title: 'Переменные',
            type: 'item',
            url: '/variables',
            icon: icons.IconVariable,
            breadcrumbs: true
        },
        {
            id: 'apikey',
            title: 'API-ключи',
            type: 'item',
            url: '/apikey',
            icon: icons.IconHierarchy,
            breadcrumbs: true
        }
    ]
}

export default dashboard
