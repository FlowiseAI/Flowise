// assets
import {
    IconTrash,
    IconFileUpload,
    IconFileExport,
    IconCopy,
    IconMessage,
    IconDatabaseExport,
    IconAdjustmentsHorizontal,
    IconUsers
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
    IconUsers
}

// ==============================|| SETTINGS MENU ITEMS ||============================== //

const agent_settings = {
    id: 'settings',
    title: '',
    type: 'group',
    children: [
        {
            id: 'viewMessages',
            title: 'Посмотреть сообщения',
            type: 'item',
            url: '',
            icon: icons.IconMessage
        },
        {
            id: 'viewLeads',
            title: 'Посмотреть лидов',
            type: 'item',
            url: '',
            icon: icons.IconUsers
        },
        {
            id: 'chatflowConfiguration',
            title: 'Конфигурация',
            type: 'item',
            url: '',
            icon: icons.IconAdjustmentsHorizontal
        },
        {
            id: 'duplicateChatflow',
            title: 'Создать дубликат агентов',
            type: 'item',
            url: '',
            icon: icons.IconCopy
        },
        {
            id: 'loadChatflow',
            title: 'Загрузить агентов',
            type: 'item',
            url: '',
            icon: icons.IconFileUpload
        },
        {
            id: 'exportChatflow',
            title: 'Экспортировать агентов',
            type: 'item',
            url: '',
            icon: icons.IconFileExport
        },
        {
            id: 'deleteChatflow',
            title: 'Удалить агентов',
            type: 'item',
            url: '',
            icon: icons.IconTrash
        }
    ]
}

export default agent_settings
