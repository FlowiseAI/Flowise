// assets
import {
    IconTrash,
    IconFileUpload,
    IconFileExport,
    IconCopy,
    IconMessage,
    IconDatabaseExport,
    IconAdjustmentsHorizontal,
    IconUsers,
    IconTemplate
} from '@tabler/icons-react'

// constant
const icons = {
    IconTrash,
    IconFileUpload,
    IconFileExport,
    IconCopy,
    IconMessage,
    IconDatabaseExport,
    IconAdjustmentsHorizontal,
    IconUsers,
    IconTemplate
}

// ==============================|| SETTINGS MENU ITEMS ||============================== //

const agent_settings = {
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
            icon: icons.IconAdjustmentsHorizontal,
            permission: 'agentflows:config'
        },
        {
            id: 'saveAsTemplate',
            title: 'Save As Template',
            type: 'item',
            url: '',
            icon: icons.IconTemplate,
            permission: 'templates:flowexport'
        },
        {
            id: 'duplicateChatflow',
            title: 'Duplicate Agents',
            type: 'item',
            url: '',
            icon: icons.IconCopy,
            permission: 'agentflows:duplicate'
        },
        {
            id: 'loadChatflow',
            title: 'Load Agents',
            type: 'item',
            url: '',
            icon: icons.IconFileUpload,
            permission: 'agentflows:import'
        },
        {
            id: 'exportChatflow',
            title: 'Export Agents',
            type: 'item',
            url: '',
            icon: icons.IconFileExport,
            permission: 'agentflows:export'
        },
        {
            id: 'deleteChatflow',
            title: 'Delete Agents',
            type: 'item',
            url: '',
            icon: icons.IconTrash,
            permission: 'agentflows:delete'
        }
    ]
}

export default agent_settings
