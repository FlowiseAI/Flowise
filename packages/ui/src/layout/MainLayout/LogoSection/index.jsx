import { Link } from 'react-router-dom'
import { useDispatch } from 'react-redux'

// material-ui
import { ButtonBase } from '@mui/material'

// project imports
import config from '@/config'
import Logo from '@/ui-component/extended/Logo'
import { MENU_OPEN } from '@/store/actions'

// ==============================|| MAIN LOGO ||============================== //

const LogoSection = () => {
    const dispatch = useDispatch()

    const handleLogoClick = (e) => {
        dispatch({ type: MENU_OPEN, id: 'chatflows' })
    }

    return (
        <ButtonBase disableRipple component={Link} to={config.defaultPath} onClick={handleLogoClick}>
            <Logo />
        </ButtonBase>
    )
}

export default LogoSection
