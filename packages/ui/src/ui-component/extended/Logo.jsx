import logo from 'assets/images/productminds-black-400w.png'

import { useSelector } from 'react-redux'

// ==============================|| LOGO ||============================== //

const Logo = () => {
    const customization = useSelector((state) => state.customization)

    return (
        <div style={{ alignItems: 'center', display: 'flex', flexDirection: 'row' }}>
            <img
                style={{ objectFit: 'contain', height: 'auto', width: 150, filter: customization.isDarkMode ? 'invert(1)' : 'invert(0)' }}
                src={logo}
                alt='Productminds'
            />
        </div>
    )
}

export default Logo
