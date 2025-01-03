import { useRoutes } from 'react-router-dom'

// routes
import MainRoutes from './MainRoutes'
import CanvasRoutes from './CanvasRoutes'
import ChatbotRoutes from './ChatbotRoutes'
import { useCallback, useEffect, useMemo } from 'react'
import { useDispatch } from 'react-redux'
import { loginAction } from '@/store/actions'
import useApi from '@/hooks/useApi'
import userApi from '@/api/user'

// ==============================|| ROUTING RENDER ||============================== //

export default function ThemeRoutes() {
  const dispatch = useDispatch()
  const login = (...args) => dispatch(loginAction(...args))
  const getUserById = useApi(userApi.getUserById)
  const dataLogin = useMemo(() => (localStorage.getItem('dataLogin') ? JSON?.parse(localStorage.getItem('dataLogin')) : {}), [])

  const handleGetUserById = useCallback(
    async (id) => {
      const resData = await getUserById.request(id)
      if (resData) {
        localStorage.setItem('dataLogin', JSON.stringify({ ...dataLogin, user: resData }))
        login(resData)
      }
    },
    [getUserById, dataLogin]
  )

  useEffect(() => {
    if (dataLogin?.user?.id) {
      handleGetUserById(dataLogin.user.id)
      login(dataLogin.user)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataLogin])
  return useRoutes([MainRoutes, CanvasRoutes, ChatbotRoutes])
}
