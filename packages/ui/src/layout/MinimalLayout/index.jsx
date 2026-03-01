import { Outlet } from 'react-router-dom'
import { WebSocketProvider } from '@/contexts/WebSocketContext'

// ==============================|| MINIMAL LAYOUT ||============================== //

const MinimalLayout = () => (
    <WebSocketProvider>
        <Outlet />
    </WebSocketProvider>
)

export default MinimalLayout
