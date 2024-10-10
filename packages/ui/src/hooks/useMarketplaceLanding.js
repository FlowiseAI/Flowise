import { useState, useEffect, useContext } from 'react'
import marketplacesApi from '@/api/marketplaces'
import useApi from '@/hooks/useApi'
import { Auth0Context } from '@/AppProvider'

const useMarketplaceLanding = (templateId) => {
    const [template, setTemplate] = useState(null)
    const { isAuth0Ready } = useContext(Auth0Context)

    const getSpecificTemplateApi = useApi(marketplacesApi.getSpecificMarketplaceTemplate)

    useEffect(() => {
        console.log('[useMarketplaceLanding] Hook initialized with templateId:', templateId)
        if (templateId && isAuth0Ready) {
            console.log('[useMarketplaceLanding] Auth0 is ready. Requesting template data for id:', templateId)
            getSpecificTemplateApi.request(templateId)
        }
    }, [templateId, isAuth0Ready])

    useEffect(() => {
        console.log('[useMarketplaceLanding] API response received:', getSpecificTemplateApi.data)
        if (getSpecificTemplateApi.data) {
            console.log('[useMarketplaceLanding] Setting template data')
            setTemplate(getSpecificTemplateApi.data)
        }
    }, [getSpecificTemplateApi.data])

    console.log('[useMarketplaceLanding] Current state:', {
        template,
        isLoading: !isAuth0Ready || getSpecificTemplateApi.loading,
        error: getSpecificTemplateApi.error
    })

    return {
        template,
        isLoading: !isAuth0Ready || getSpecificTemplateApi.loading,
        error: getSpecificTemplateApi.error
    }
}

export default useMarketplaceLanding
