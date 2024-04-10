import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

function notifyParentOfNavigation() {
    const currentUrl = window.location.href
    // Adjust the target origin as needed for security
    window.parent.postMessage(currentUrl, '*')
}

export const useNotifyParentOfNavigation = () => {
    const location = useLocation()

    useEffect(() => {
        notifyParentOfNavigation()
    }, [location]) // This effect runs when the location changes
}

export default useNotifyParentOfNavigation
