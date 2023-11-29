// assets
import { IconHierarchy, IconBuildingStore, IconKey, IconTool, IconLock, IconRobot, IconTable } from '@tabler/icons'
import { ReactComponent as IconKeys } from 'assets/images/IconKey.svg'
import { ReactComponent as IconSmile } from 'assets/images/smile.svg'
import { ReactComponent as IconCollection } from 'assets/images/collection.svg'
import { ReactComponent as IconLocks } from 'assets/images/lock.svg'
// constant
const icons = {
    IconHierarchy,
    IconBuildingStore,
    IconKey,
    IconTool,
    IconLock,
    IconRobot,
    IconTable
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
            icon: IconCollection,
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
            icon: IconSmile,
            breadcrumbs: true
        },
        {
            id: 'credentials',

            title: 'Учетные данные',
            type: 'item',
            url: '/credentials',
            icon: IconLocks,
            breadcrumbs: true
        },
        {
            id: 'apikey',
            title: 'API-ключи',
            type: 'item',
            url: '/apikey',
            icon: IconKeys,
            breadcrumbs: true
        }
    ]
}

export default dashboard
