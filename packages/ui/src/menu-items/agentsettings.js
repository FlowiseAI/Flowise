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

// Translation
import { t } from '@/i18n'

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
            title: t('agent.viewMessages'),
            type: 'item',
            url: '',
            icon: icons.IconMessage
        },
        {
            id: 'viewLeads',
            title: t('agent.viewLeads'),
            type: 'item',
            url: '',
            icon: icons.IconUsers
        },
        {
            id: 'chatflowConfiguration',
            title: t('agent.configuration'),
            type: 'item',
            url: '',
            icon: icons.IconAdjustmentsHorizontal,
            permission: 'agentflows:config'
        },
        {
            id: 'saveAsTemplate',
            title: t('agent.saveAsTemplate'),
            type: 'item',
            url: '',
            icon: icons.IconTemplate,
            permission: 'templates:flowexport'
        },
        {
            id: 'duplicateChatflow',
            title: t('agent.duplicateAgents'),
            type: 'item',
            url: '',
            icon: icons.IconCopy,
            permission: 'agentflows:duplicate'
        },
        {
            id: 'loadChatflow',
            title: t('agent.loadAgents'),
            type: 'item',
            url: '',
            icon: icons.IconFileUpload,
            permission: 'agentflows:import'
        },
        {
            id: 'exportChatflow',
            title: t('agent.exportAgents'),
            type: 'item',
            url: '',
            icon: icons.IconFileExport,
            permission: 'agentflows:export'
        },
        {
            id: 'deleteChatflow',
            title: t('agent.deleteAgents'),
            type: 'item',
            url: '',
            icon: icons.IconTrash,
            permission: 'agentflows:delete'
        }
    ]
}

export default agent_settings
