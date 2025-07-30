import { useEffect } from 'react'
import PropTypes from 'prop-types'

// Hooks
import useApi from '@/hooks/useApi'
import chatflowsApi from '@/api/chatflows'

const RequireAuthIfNotpublic = ({ children }) => {
    const chatflowId = window.location.pathname.split('/').pop()
    const getSpecificChatflowFromPublicEndpointApi = useApi(chatflowsApi.getSpecificChatflowFromPublicEndpoint)

    useEffect(() => {
        const fetchChatflow = async () => {
            await getSpecificChatflowFromPublicEndpointApi.request(chatflowId)
        }
        fetchChatflow()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chatflowId])

    return children
}

RequireAuthIfNotpublic.propTypes = {
    children: PropTypes.node.isRequired
}

export default RequireAuthIfNotpublic
