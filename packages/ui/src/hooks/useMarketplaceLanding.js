import { useState, useEffect, useContext } from 'react'
import marketplacesApi from '@/api/marketplaces'
import useApi from '@/hooks/useApi'
import { Auth0Context } from '@/AppProvider'

const useMarketplaceLanding = (templateId) => {
    const [template, setTemplate] = useState(null)
    const { isAuth0Ready } = useContext(Auth0Context)
    const getSpecificTemplateApi = useApi((id) => marketplacesApi.getSpecificMarketplaceTemplate(id))

    useEffect(() => {
        if (templateId) {
            getSpecificTemplateApi.request(templateId)
        }
    }, [templateId, isAuth0Ready])

    useEffect(() => {
        if (getSpecificTemplateApi.data) {
            setTemplate(getSpecificTemplateApi.data)
        }
    }, [getSpecificTemplateApi.data])

    return {
        template,
        isLoading: getSpecificTemplateApi.loading && !template && templateId == template?.id,
        error: getSpecificTemplateApi.error
    }
}

export default useMarketplaceLanding
