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
            title: 'View Messages',
            type: 'item',
            url: '',
            icon: icons.IconMessage
        },
        {
            id: 'viewLeads',
            title: 'View Leads',
            type: 'item',
            url: '',
            icon: icons.IconUsers
        },
        {
            id: 'chatflowConfiguration',
            title: 'Configuration',
            type: 'item',
            url: '',
            icon: icons.IconAdjustmentsHorizontal
        },
        {
            id: 'deleteAssistant',
            title: 'Delete Assistant',
            type: 'item',
            url: '',
            icon: icons.IconTrash
        }
    ]
}

export default customAssistantSettings
