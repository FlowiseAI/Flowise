// assets
import { IconTrash, IconFileUpload, IconFileExport, IconCopy, IconSearch, IconMessage, IconPictureInPictureOff } from '@tabler/icons'

// constant
const icons = { IconTrash, IconFileUpload, IconFileExport, IconCopy, IconSearch, IconMessage, IconPictureInPictureOff }

// ==============================|| SETTINGS MENU ITEMS ||============================== //
const settings = {
    id: 'settings',
    title: '',
    type: 'group',
    children: [
        {
            id: 'conversationStarters',
            title: 'Starter Prompts',
            type: 'item',
            url: '',
            icon: icons.IconPictureInPictureOff
        },
        {
            id: 'viewMessages',
            title: 'Просмотр сообщений',
            type: 'item',
            url: '',
            icon: icons.IconMessage
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
            id: 'analyseChatflow',
            title: 'Анализ Проекта',
            type: 'item',
            url: '',
            icon: icons.IconSearch
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
