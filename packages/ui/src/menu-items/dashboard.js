// assets
import { IconHierarchy, IconKey, IconBook, IconListCheck } from '@tabler/icons'

// constant
const icons = { IconHierarchy, IconKey, IconBook, IconListCheck }

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
        }
    ]
}

export default dashboard
