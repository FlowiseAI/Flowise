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

const settings = {
    id: 'settings',
    title: '',
    type: 'group',
    children: [
        {
            id: 'viewMessages',
            title: t('chatflow.viewMessages'),
            type: 'item',
            url: '',
            icon: icons.IconMessage
        },
        {
            id: 'viewLeads',
            title: t('chatflow.viewLeads'),
            type: 'item',
            url: '',
            icon: icons.IconUsers
        },
        {
            id: 'viewUpsertHistory',
            title: t('chatflow.upsertHistory'),
            type: 'item',
            url: '',
            icon: icons.IconDatabaseExport
        },
        {
            id: 'chatflowConfiguration',
            title: t('chatflow.configuration'),
            type: 'item',
            url: '',
            permission: 'chatflows:config',
            icon: icons.IconAdjustmentsHorizontal
        },
        {
            id: 'saveAsTemplate',
            title: t('chatflow.saveAsTemplate'),
            type: 'item',
            url: '',
            icon: icons.IconTemplate,
            permission: 'templates:flowexport'
        },
        {
            id: 'duplicateChatflow',
            title: t('chatflow.duplicateChatflow'),
            type: 'item',
            url: '',
            icon: icons.IconCopy,
            permission: 'chatflows:duplicate'
        },
        {
            id: 'loadChatflow',
            title: t('chatflow.loadChatflow'),
            type: 'item',
            url: '',
            icon: icons.IconFileUpload,
            permission: 'chatflows:import'
        },
        {
            id: 'exportChatflow',
            title: t('chatflow.exportChatflow'),
            type: 'item',
            url: '',
            icon: icons.IconFileExport,
            permission: 'chatflows:export'
        },
        {
            id: 'deleteChatflow',
            title: t('chatflow.deleteChatflow'),
            type: 'item',
            url: '',
            icon: icons.IconTrash,
            permission: 'chatflows:delete'
        }
    ]
}

export default settings
