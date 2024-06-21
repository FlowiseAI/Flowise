import logo from '@/assets/images/genAI_logo.jpeg'
import logoDark from '@/assets/images/genAI_logo.jpeg'

import { useSelector } from 'react-redux'

// ==============================|| LOGO ||============================== //

const Logo = () => {
    const customization = useSelector((state) => state.customization)

    return (
        <div style={{ alignItems: 'center', display: 'flex', flexDirection: 'row' }}>
            <img
                style={{ objectFit: 'contain', height: 'auto', width: 150 }}
                src={customization.isDarkMode ? logoDark : logo}
                alt='GenAI Studio'
            />
        </div>
    )
}

export default Logo
