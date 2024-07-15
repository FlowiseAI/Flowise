import {
    IconUsersGroup,
    IconHierarchy,
    IconBuildingStore,
    IconKey,
    IconTool,
    IconLock,
    IconRobot,
    IconVariable,
    IconFiles,
    IconTable
} from '@tabler/icons-react'

// constant
const icons = {
    IconUsersGroup,
    IconTable,
    IconHierarchy,
    IconBuildingStore,
    IconKey,
    IconTool,
    IconLock,
    IconRobot,
    IconVariable,
    IconFiles
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
            id: 'agentflows',
            title: 'Агенты',
            type: 'item',
            url: '/agentflows',
            icon: icons.IconUsersGroup,
            breadcrumbs: true,
            isBeta: true
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
            title: 'Ассистенты',
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
        },
        {
            id: 'document-stores',
            title: 'Хранилища документов',
            type: 'item',
            url: '/document-stores',
            icon: icons.IconFiles,
            breadcrumbs: true
        }
    ]
}

export default dashboard
