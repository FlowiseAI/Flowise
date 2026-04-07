// assets
import { IconTrash, IconMessage, IconAdjustmentsHorizontal, IconUsers } from '@tabler/icons-react'

// constant
const icons = {
    IconTrash,
    IconMessage,
    IconAdjustmentsHorizontal,
    IconUsers
}

// ==============================|| SETTINGS MENU ITEMS ||============================== //

const customAssistantSettings = {
    id: 'settings',
    title: '',
    type: 'group',
    children: [
        {
            id: 'viewMessages',
            title: 'menu.viewMessages',
            type: 'item',
            url: '',
            icon: icons.IconMessage
        },
        {
            id: 'viewLeads',
            title: 'menu.viewLeads',
            type: 'item',
            url: '',
            icon: icons.IconUsers
        },
        {
            id: 'chatflowConfiguration',
            title: 'menu.configuration',
            type: 'item',
            url: '',
            icon: icons.IconAdjustmentsHorizontal,
            permission: 'assistants:update'
        },
        {
            id: 'deleteAssistant',
            title: 'menu.deleteAssistant',
            type: 'item',
            url: '',
            icon: icons.IconTrash,
            permission: 'assistants:delete'
        }
    ]
}

export default customAssistantSettings
