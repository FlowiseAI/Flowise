import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useSelector } from 'react-redux'

import { store } from '@/store'
import { organizationUpdated } from '@/store/reducers/authSlice'

// hooks
import useApi from '@/hooks/useApi'

// api
import organizationApi from '@/api/organization'

// ==============================|| MINIMAL LAYOUT ||============================== //

const MinimalLayout = () => {
    // authenticated user
    const user = useSelector((state) => state.auth.user)
    const isAuthenticated = useSelector((state) => state.auth.isAuthenticated)

    const getOrganizationsByIdApi = useApi(organizationApi.getOrganizationById)

    useEffect(() => {
        if (isAuthenticated && user) {
            getOrganizationsByIdApi.request(user.activeOrganizationId)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, user])

    useEffect(() => {
        if (getOrganizationsByIdApi.data) {
            store.dispatch(organizationUpdated(getOrganizationsByIdApi.data))
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getOrganizationsByIdApi.data])

    return (
        <>
            <Outlet />
        </>
    )
}

export default MinimalLayout
