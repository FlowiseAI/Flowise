// assets
import {
  IconBuildingStore,
  IconFileExport,
  IconFiles,
  IconFolderFilled,
  IconHierarchy,
  IconKey,
  IconLock,
  IconRobot,
  IconSettings,
  IconTemplate,
  IconTool,
  IconUsersGroup,
  IconVariable,
  IconFile
} from '@tabler/icons-react'

// constant
const icons = {
  IconUsersGroup,
  IconHierarchy,
  IconBuildingStore,
  IconKey,
  IconTool,
  IconLock,
  IconRobot,
  IconVariable,
  IconFiles,
  IconFileExport,
  IconSettings,
  IconTemplate,
  IconFolderFilled,
  IconFile
}

// ==============================|| DASHBOARD MENU ITEMS ||============================== //

const dashboard = {
  id: 'dashboard',
  title: '',
  type: 'group',
  children: [
    {
      id: 'chatflows',
      title: 'Chatflows',
      type: 'item',
      url: '/chatflows',
      icon: icons.IconHierarchy,
      breadcrumbs: true
    },
    {
      id: 'document-stores',
      title: 'Kho Tài Liệu',
      // type: 'item',
      type: 'collapse',
      // url: '/document-stores',
      icon: icons.IconFiles,
      breadcrumbs: true,
      children: [
        {
          id: 'single-file',
          title: 'Single file',
          type: 'item',
          url: '/document-stores',
          icon: icons.IconFile,
          breadcrumbs: true
        },
        {
          id: 'directory',
          title: 'Directory',
          type: 'item',
          url: '/document-stores-new',
          icon: icons.IconFolderFilled,
          breadcrumbs: true
        }
      ]
    },
    {
      id: 'agentflows',
      title: 'Agentflows',
      type: 'item',
      url: '/agentflows',
      icon: icons.IconUsersGroup,
      breadcrumbs: true,
      isBeta: false
    },
    {
      id: 'marketplaces',
      title: 'Mẫu',
      type: 'item',
      url: '/marketplaces',
      icon: icons.IconTemplate,
      breadcrumbs: true
    },
    {
      id: 'others',
      title: 'Cài Đặt & Công Cụ',
      type: 'collapse',
      icon: icons.IconSettings,
      breadcrumbs: true,
      children: [
        {
          id: 'tools',
          title: 'Công Cụ',
          type: 'item',
          url: '/tools',
          icon: icons.IconTool,
          breadcrumbs: true
        },
        // {
        //     id: 'assistants',
        //     title: 'Trợ Lý',
        //     type: 'item',
        //     url: '/assistants',
        //     icon: icons.IconRobot,
        //     breadcrumbs: true
        // },
        {
          id: 'credentials',
          title: 'Thông Tin Xác Thực',
          type: 'item',
          url: '/credentials',
          icon: icons.IconLock,
          breadcrumbs: true
        },
        {
          id: 'variables',
          title: 'Biến',
          type: 'item',
          url: '/variables',
          icon: icons.IconVariable,
          breadcrumbs: true
        },
        {
          id: 'apikey',
          title: 'Khóa API',
          type: 'item',
          url: '/apikey',
          icon: icons.IconKey,
          breadcrumbs: true
        }
      ]
    }
  ]
}

export default dashboard
