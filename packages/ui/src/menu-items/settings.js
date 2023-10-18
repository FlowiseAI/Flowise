// assets
import { IconTrash, IconFileUpload, IconFileExport, IconCopy, IconSearch } from '@tabler/icons'

// constant
const icons = { IconTrash, IconFileUpload, IconFileExport, IconCopy, IconSearch }

// ==============================|| SETTINGS MENU ITEMS ||============================== //

const settings = {
    id: 'settings',
    title: '',
    type: 'group',
    children: [
        {
            id: 'duplicateChatflow',
            title: 'Duplicate Chatflow',
            type: 'item',
            url: '',
            icon: icons.IconCopy
        },
        {
            id: 'loadChatflow',
            title: 'Load Chatflow',
            type: 'item',
            url: '',
            icon: icons.IconFileUpload
        },
        {
            id: 'exportChatflow',
            title: 'Export Chatflow',
            type: 'item',
            url: '',
            icon: icons.IconFileExport
        },
        {
            id: 'analyseChatflow',
            title: 'Analyse Chatflow',
            type: 'item',
            url: '',
            icon: icons.IconSearch
        },
        {
            id: 'deleteChatflow',
            title: 'Delete Chatflow',
            type: 'item',
            url: '',
            icon: icons.IconTrash
        }
    ]
}

export default settings
