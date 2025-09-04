import { useSelector } from 'react-redux'

// ==============================|| LOGO ||============================== //

const Logo = () => {
    const customization = useSelector((state) => state.customization)

    return (
        <div style={{ alignItems: 'center', display: 'flex', flexDirection: 'row', marginLeft: '10px' }}>
            <h1 style={{
                fontSize: '28px',
                fontWeight: 'bold',
                color: customization.isDarkMode ? '#ffffff' : '#1976d2',
                margin: 0,
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                letterSpacing: '0.5px'
            }}>
                Freia
            </h1>
        </div>
    )
}

export default Logo
