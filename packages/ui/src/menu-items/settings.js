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

const settings = {
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
            id: 'viewUpsertHistory',
            title: 'menu.viewUpsertHistory',
            type: 'item',
            url: '',
            icon: icons.IconDatabaseExport
        },
        {
            id: 'chatflowConfiguration',
            title: 'menu.configuration',
            type: 'item',
            url: '',
            permission: 'chatflows:config',
            icon: icons.IconAdjustmentsHorizontal
        },
        {
            id: 'saveAsTemplate',
            title: 'menu.saveAsTemplate',
            type: 'item',
            url: '',
            icon: icons.IconTemplate,
            permission: 'templates:flowexport'
        },
        {
            id: 'duplicateChatflow',
            title: 'menu.duplicateChatflow',
            type: 'item',
            url: '',
            icon: icons.IconCopy,
            permission: 'chatflows:duplicate'
        },
        {
            id: 'loadChatflow',
            title: 'menu.loadChatflow',
            type: 'item',
            url: '',
            icon: icons.IconFileUpload,
            permission: 'chatflows:import'
        },
        {
            id: 'exportChatflow',
            title: 'menu.exportChatflow',
            type: 'item',
            url: '',
            icon: icons.IconFileExport,
            permission: 'chatflows:export'
        },
        {
            id: 'deleteChatflow',
            title: 'menu.deleteChatflow',
            type: 'item',
            url: '',
            icon: icons.IconTrash,
            permission: 'chatflows:delete'
        }
    ]
}

export default settings
