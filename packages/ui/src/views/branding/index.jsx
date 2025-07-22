import { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'

import { Button, Box, Typography } from '@mui/material'

import MainCard from '@/ui-component/cards/MainCard'
import ViewHeader from '@/layout/MainLayout/ViewHeader'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction } from '@/store/actions'

import variablesApi from '@/api/variables'
import useApi from '@/hooks/useApi'
import useNotifier from '@/utils/useNotifier'

import { IconX } from '@tabler/icons-react'

const Branding = () => {
    const dispatch = useDispatch()
    useNotifier()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [logo, setLogo] = useState('')
    const [brandingVar, setBrandingVar] = useState(null)

    const getAllVariablesApi = useApi(variablesApi.getAllVariables)

    useEffect(() => {
        getAllVariablesApi.request()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (getAllVariablesApi.data) {
            const found = getAllVariablesApi.data.data.find((v) => v.name === 'BRANDING_LOGO')
            if (found) {
                setBrandingVar(found)
                setLogo(found.value)
            }
        }
    }, [getAllVariablesApi.data])

    const handleFileChange = (e) => {
        if (!e.target.files || !e.target.files[0]) return
        const file = e.target.files[0]
        const reader = new FileReader()
        reader.onload = (evt) => {
            if (!evt?.target?.result) return
            setLogo(evt.target.result)
        }
        reader.readAsDataURL(file)
    }

    const saveBranding = async () => {
        try {
            const obj = { name: 'BRANDING_LOGO', value: logo, type: 'static' }
            if (brandingVar) {
                await variablesApi.updateVariable(brandingVar.id, obj)
            } else {
                await variablesApi.createVariable(obj)
            }
            enqueueSnackbar({
                message: 'Branding saved',
                options: {
                    key: new Date().getTime() + Math.random(),
                    variant: 'success',
                    action: (key) => (
                        <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                            <IconX />
                        </Button>
                    )
                }
            })
        } catch (error) {
            enqueueSnackbar({
                message: `Failed to save branding: ${error.response?.data?.message || error.message}`,
                options: {
                    key: new Date().getTime() + Math.random(),
                    variant: 'error',
                    persist: true,
                    action: (key) => (
                        <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                            <IconX />
                        </Button>
                    )
                }
            })
        }
    }

    return (
        <MainCard>
            <ViewHeader title='Branding' description='Upload a custom logo for the application' />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <input type='file' accept='image/*' onChange={handleFileChange} />
                {logo && (
                    <Box sx={{ mt: 1 }}>
                        <Typography variant='body2'>Preview:</Typography>
                        <img src={logo} alt='branding logo' style={{ height: 60, marginTop: 8 }} />
                    </Box>
                )}
                <Button variant='contained' sx={{ width: 'fit-content' }} onClick={saveBranding} disabled={!logo}>
                    Save
                </Button>
            </Box>
        </MainCard>
    )
}

export default Branding
