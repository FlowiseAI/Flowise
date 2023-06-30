// assets
import { IconHierarchy, IconBuildingStore, IconKey, IconTool, IconArticle } from '@tabler/icons'
import DataObjectIcon from '@mui/icons-material/DataObject'

// constant
const icons = { IconHierarchy, IconBuildingStore, IconKey, IconTool, DataObjectIcon, IconArticle }

// ==============================|| DASHBOARD MENU ITEMS ||============================== //

const dashboard = {
    id: 'dashboard',
    title: '',
    type: 'group',
    children: [
        {
            id: 'chatflows',
            title: 'Chatflows',
            type: 'item',
            url: '/chatflows',
            icon: icons.IconHierarchy,
            breadcrumbs: true
        },
        {
            id: 'marketplaces',
            title: 'Marketplaces',
            type: 'item',
            url: '/marketplaces',
            icon: icons.IconBuildingStore,
            breadcrumbs: true
        },
        {
            id: 'tools',
            title: 'Tools',
            type: 'item',
            url: '/tools',
            icon: icons.IconTool,
            breadcrumbs: true
        },
        {
            id: 'apikey',
            title: 'API Keys',
            type: 'item',
            url: '/apikey',
            icon: icons.IconKey,
            breadcrumbs: true
        },
        {
            id: 'chat-logs',
            title: 'Chat Logs',
            type: 'item',
            url: '/chat-logs',
            icon: icons.IconArticle,
            breadcrumbs: true
        },
        {
            id: 'sources',
            title: 'Data sources',
            type: 'item',
            url: '/sources',
            icon: icons.DataObjectIcon,
            breadcrumbs: true
        }
    ]
}

export default dashboard
