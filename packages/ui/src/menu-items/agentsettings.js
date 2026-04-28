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

const agentSettings = {
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
            id: 'agentConfiguration',
            title: 'Configuration',
            type: 'item',
            url: '',
            icon: icons.IconAdjustmentsHorizontal,
            permission: 'agents:update'
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
            id: 'duplicateAgent',
            title: 'Duplicate Agent',
            type: 'item',
            url: '',
            icon: icons.IconCopy,
            permission: 'agents:create'
        },
        {
            id: 'loadAgent',
            title: 'Load Agent',
            type: 'item',
            url: '',
            icon: icons.IconFileUpload,
            permission: 'agents:create'
        },
        {
            id: 'exportAgent',
            title: 'Export Agent',
            type: 'item',
            url: '',
            icon: icons.IconFileExport,
            permission: 'agents:update'
        },
        {
            id: 'deleteAgent',
            title: 'Delete Agent',
            type: 'item',
            url: '',
            icon: icons.IconTrash,
            permission: 'agents:delete'
        }
    ]
}

export default agentSettings
