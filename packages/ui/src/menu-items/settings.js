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
const settings = {
    id: 'settings',
    title: '',
    type: 'group',
    children: [
        {
            id: 'viewMessages',
            title: 'Просмотр сообщений',
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
            id: 'viewUpsertHistory',
            title: 'Вложенная история',
            type: 'item',
            url: '',
            icon: icons.IconDatabaseExport
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
            title: 'Дублировать Проект',
            type: 'item',
            url: '',
            icon: icons.IconCopy
        },
        {
            id: 'loadChatflow',
            title: 'Загрузить Проект',
            type: 'item',
            url: '',
            icon: icons.IconFileUpload
        },
        {
            id: 'exportChatflow',
            title: 'Скачать Проект',
            type: 'item',
            url: '',
            icon: icons.IconFileExport
        },
        {
            id: 'deleteChatflow',
            title: 'Удалить Проект',
            type: 'item',
            url: '',
            icon: icons.IconTrash
        }
    ]
}

export default settings
