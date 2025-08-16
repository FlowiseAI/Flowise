// assets
import { IconTrash, IconMessage, IconAdjustmentsHorizontal, IconUsers } from '@tabler/icons-react'

// Translation
import { t } from '@/i18n'

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
            title: t('assistant.viewMessages'),
            type: 'item',
            url: '',
            icon: icons.IconMessage
        },
        {
            id: 'viewLeads',
            title: t('assistant.viewLeads'),
            type: 'item',
            url: '',
            icon: icons.IconUsers
        },
        {
            id: 'chatflowConfiguration',
            title: t('assistant.configuration'),
            type: 'item',
            url: '',
            icon: icons.IconAdjustmentsHorizontal,
            permission: 'assistants:update'
        },
        {
            id: 'deleteAssistant',
            title: t('assistant.deleteAssistant'),
            type: 'item',
            url: '',
            icon: icons.IconTrash,
            permission: 'assistants:delete'
        }
    ]
}

export default customAssistantSettings
