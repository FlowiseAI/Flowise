import platformsettingsApi from '@/api/platformsettings'
import PropTypes from 'prop-types'
import { createContext, useContext, useEffect, useState } from 'react'

const ConfigContext = createContext()

export const ConfigProvider = ({ children }) => {
    const [config, setConfig] = useState({})
    const [loading, setLoading] = useState(true)
    const [isEnterpriseLicensed, setEnterpriseLicensed] = useState(false)
    const [isCloud, setCloudLicensed] = useState(false)
    const [isOpenSource, setOpenSource] = useState(false)

    const fetchSettings = async () => {
        try {
            const currentSettingsData = await platformsettingsApi.getSettings()
            const finalData = {
                ...currentSettingsData.data
            }
            setConfig(finalData)
            if (finalData.PLATFORM_TYPE) {
                if (finalData.PLATFORM_TYPE === 'enterprise') {
                    setEnterpriseLicensed(true)
                    setCloudLicensed(false)
                    setOpenSource(false)
                } else if (finalData.PLATFORM_TYPE === 'cloud') {
                    setCloudLicensed(true)
                    setEnterpriseLicensed(false)
                    setOpenSource(false)
                } else {
                    setOpenSource(true)
                    setEnterpriseLicensed(false)
                    setCloudLicensed(false)
                }
            }
            setLoading(false)
        } catch (error) {
            console.error('Error fetching data:', error)
            setLoading(false)
        }
    }

    const refreshConfig = () => {
        setLoading(true)
        fetchSettings()
    }

    useEffect(() => {
        fetchSettings()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <ConfigContext.Provider value={{ config, loading, isEnterpriseLicensed, isCloud, isOpenSource, refreshConfig }}>
            {children}
        </ConfigContext.Provider>
    )
}

export const useConfig = () => useContext(ConfigContext)

ConfigProvider.propTypes = {
    children: PropTypes.any
}
