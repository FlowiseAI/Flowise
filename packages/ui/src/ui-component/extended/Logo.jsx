import logo from '@/assets/images/flowise_white.svg'
import logoDark from '@/assets/images/flowise_dark.svg'
import { useConfig } from '@/store/context/ConfigContext'

import { useSelector } from 'react-redux'

// ==============================|| LOGO ||============================== //

const Logo = () => {
    const customization = useSelector((state) => state.customization)
    const { config } = useConfig()

    return (
        <div style={{ alignItems: 'center', display: 'flex', flexDirection: 'row', marginLeft: '10px' }}>
            <img
                style={{ objectFit: 'contain', height: 'auto', width: 150 }}
                src={config.BRANDING_LOGO || (customization.isDarkMode ? logoDark : logo)}
                alt='Flowise'
            />
        </div>
    )
}

export default Logo
