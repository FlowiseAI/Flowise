import logo from '@/assets/images/flowise_logo.png'
import logoDark from '@/assets/images/flowise_logo_dark.png'

import { useSelector } from 'react-redux'

// ==============================|| LOGO ||============================== //

const Logo = () => {
    const customization = useSelector((state) => state.customization)

    return (
        <div className='flex items-center'>
            <img className='w-auto h-10 object-contain' src={customization.isDarkMode ? logoDark : logo} alt='Flowise' />
        </div>
    )
}

export default Logo
