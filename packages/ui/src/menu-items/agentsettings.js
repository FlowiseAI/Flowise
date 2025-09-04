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
import { t } from 'i18next'

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
            title: t('agentSettings.viewMessages'),
            type: 'item',
            url: '',
            icon: icons.IconMessage
        },
        {
            id: 'viewLeads',
            title: t('agentSettings.viewLeads'),
            type: 'item',
            url: '',
            icon: icons.IconUsers
        },
        {
            id: 'chatflowConfiguration',
            title: t('agentSettings.configuration'),
            type: 'item',
            url: '',
            icon: icons.IconAdjustmentsHorizontal,
            permission: 'agentflows:config'
        },
        {
            id: 'saveAsTemplate',
            title: t('agentSettings.saveAsTemplate'),
            type: 'item',
            url: '',
            icon: icons.IconTemplate,
            permission: 'templates:flowexport'
        },
        {
            id: 'duplicateChatflow',
            title: t('agentSettings.duplicateAgents'),
            type: 'item',
            url: '',
            icon: icons.IconCopy,
            permission: 'agentflows:duplicate'
        },
        {
            id: 'loadChatflow',
            title: t('agentSettings.loadAgents'),
            type: 'item',
            url: '',
            icon: icons.IconFileUpload,
            permission: 'agentflows:import'
        },
        {
            id: 'exportChatflow',
            title: t('agentSettings.exportAgents'),
            type: 'item',
            url: '',
            icon: icons.IconFileExport,
            permission: 'agentflows:export'
        },
        {
            id: 'deleteChatflow',
            title: t('agentSettings.deleteAgents'),
            type: 'item',
            url: '',
            icon: icons.IconTrash,
            permission: 'agentflows:delete'
        }
    ]
}

export default agent_settings
