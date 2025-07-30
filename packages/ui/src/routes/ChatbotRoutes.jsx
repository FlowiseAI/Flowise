import { lazy } from 'react'

// project imports
import Loadable from '@/ui-component/loading/Loadable'
import MinimalLayout from '@/layout/MinimalLayout'
import RequireAuthIfNotpublic from '@/views/chatbot/RequireAuthIfNotpublic'

// canvas routing
const ChatbotFull = Loadable(lazy(() => import('@/views/chatbot')))

// ==============================|| CANVAS ROUTING ||============================== //

const ChatbotRoutes = {
    path: '/',
    element: <MinimalLayout />,
    children: [
        {
            path: '/chatbot/:id',
            element: (
                <RequireAuthIfNotpublic>
                    <ChatbotFull />
                </RequireAuthIfNotpublic>
            )
        }
    ]
}

export default ChatbotRoutes
