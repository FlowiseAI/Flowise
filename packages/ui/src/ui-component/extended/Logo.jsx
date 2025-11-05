import logo from '@/assets/images/flowise_white-cropped.svg'
import logoDark from '@/assets/images/flowise_dark-cropped.svg'

import { useSelector } from 'react-redux'

// ==============================|| LOGO ||============================== //

const Logo = () => {
    const customization = useSelector((state) => state.customization)

    return (
        <div style={{ alignItems: 'center', display: 'flex', flexDirection: 'row', marginLeft: '7px' }}>
            <img
                style={{ objectFit: 'contain', height: 'auto', width: 40 }}
                src={customization.isDarkMode ? logoDark : logo}
                alt='DigiWorks'
            />
        </div>
    )
}

export default Logo
