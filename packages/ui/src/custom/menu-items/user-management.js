// assets
import { IconUsers } from '@tabler/icons-react'

// constant
const icons = {
    IconUsers
}

// ==============================|| CUSTOM USER MANAGEMENT MENU ITEMS ||============================== //

const userManagement = {
    id: 'custom-user-management',
    title: '사용자 관리',
    type: 'group',
    children: [
        {
            id: 'user-management',
            title: '사용자 관리',
            type: 'item',
            url: '/user-management',
            icon: icons.IconUsers,
            breadcrumbs: true
        }
    ]
}

export default userManagement
