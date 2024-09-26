// import logo from '@/assets/images/flowise_logo.png'
// import logoDark from '@/assets/images/flowise_logo_dark.png'
import logoOpea from '@/assets/images/OPEA_logo.png'

import { useSelector } from 'react-redux'

// ==============================|| LOGO ||============================== //

const Logo = () => {
    const customization = useSelector((state) => state.customization)

    return (
        <div style={{ alignItems: 'center', display: 'flex', flexDirection: 'row' }}>
            <img
                style={{ objectFit: 'contain', height: 'auto', width: 150 }}
                // src={customization.isDarkMode ? logoDark : logo}
                src={logoOpea}
                alt='Flowise'
            />
        </div>
    )
}

export default Logo
