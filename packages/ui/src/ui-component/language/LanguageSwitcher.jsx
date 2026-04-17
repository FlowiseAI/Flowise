import { useMemo, useState } from 'react'
import PropTypes from 'prop-types'

// material-ui
import { IconButton, Menu, MenuItem, Tooltip, Typography } from '@mui/material'

// icons
import { IconLanguage } from '@tabler/icons-react'

import { getI18nLanguages } from '@/utils/language'

// i18n
import { useTranslation } from 'react-i18next'

const LanguageSwitcher = ({ persist = false, size = 'small' }) => {
    const { t, i18n } = useTranslation()
    const [anchorEl, setAnchorEl] = useState(null)

    const languages = useMemo(() => getI18nLanguages(i18n), [i18n])
    const currentLanguage = i18n.resolvedLanguage || i18n.language

    const open = Boolean(anchorEl)

    const handleClick = (event) => {
        setAnchorEl(event.currentTarget)
    }

    const handleClose = () => {
        setAnchorEl(null)
    }

    const handleLanguageChange = async (language) => {
        await i18n.changeLanguage(language)
        if (persist) {
            localStorage.setItem('i18nextLng', language)
        }
        handleClose()
    }

    return (
        <>
            <Tooltip title={t('components.language.title')}>
                <IconButton size={size} onClick={handleClick}>
                    <IconLanguage size={18} />
                </IconButton>
            </Tooltip>
            <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
                {languages.map((language) => (
                    <MenuItem
                        key={language}
                        selected={currentLanguage === language || currentLanguage?.startsWith(`${language}-`)}
                        onClick={() => handleLanguageChange(language)}
                    >
                        <Typography variant='body2'>{language.toUpperCase()}</Typography>
                    </MenuItem>
                ))}
            </Menu>
        </>
    )
}

LanguageSwitcher.propTypes = {
    persist: PropTypes.bool,
    size: PropTypes.oneOf(['small', 'medium', 'large'])
}

export default LanguageSwitcher
