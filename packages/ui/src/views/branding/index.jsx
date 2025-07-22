import { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'

import { Button, Box, Typography, OutlinedInput } from '@mui/material'

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
    const [footerText, setFooterText] = useState('')
    const [footerLink, setFooterLink] = useState('')
    const [brandingFooterTextVar, setBrandingFooterTextVar] = useState(null)
    const [brandingFooterLinkVar, setBrandingFooterLinkVar] = useState(null)

    const getAllVariablesApi = useApi(variablesApi.getAllVariables)

    useEffect(() => {
        getAllVariablesApi.request()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (getAllVariablesApi.data) {
            const variables = Array.isArray(getAllVariablesApi.data) ? getAllVariablesApi.data : getAllVariablesApi.data.data
            const foundLogo = variables?.find((v) => v.name === 'BRANDING_LOGO')
            if (foundLogo) {
                setBrandingVar(foundLogo)
                setLogo(foundLogo.value)
            }
            const foundFooterText = variables?.find((v) => v.name === 'BRANDING_FOOTER_TEXT')
            if (foundFooterText) {
                setBrandingFooterTextVar(foundFooterText)
                setFooterText(foundFooterText.value)
            }
            const foundFooterLink = variables?.find((v) => v.name === 'BRANDING_FOOTER_LINK')
            if (foundFooterLink) {
                setBrandingFooterLinkVar(foundFooterLink)
                setFooterLink(foundFooterLink.value)
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
            const logoObj = { name: 'BRANDING_LOGO', value: logo, type: 'static' }
            if (brandingVar) {
                await variablesApi.updateVariable(brandingVar.id, logoObj)
            } else if (logo) {
                await variablesApi.createVariable(logoObj)
            }

            const footerTextObj = { name: 'BRANDING_FOOTER_TEXT', value: footerText, type: 'static' }
            if (brandingFooterTextVar) {
                await variablesApi.updateVariable(brandingFooterTextVar.id, footerTextObj)
            } else if (footerText) {
                await variablesApi.createVariable(footerTextObj)
            }

            const footerLinkObj = { name: 'BRANDING_FOOTER_LINK', value: footerLink, type: 'static' }
            if (brandingFooterLinkVar) {
                await variablesApi.updateVariable(brandingFooterLinkVar.id, footerLinkObj)
            } else if (footerLink) {
                await variablesApi.createVariable(footerLinkObj)
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
                <OutlinedInput
                    placeholder='Footer Text'
                    value={footerText}
                    onChange={(e) => setFooterText(e.target.value)}
                />
                <OutlinedInput
                    placeholder='Footer Link'
                    value={footerLink}
                    onChange={(e) => setFooterLink(e.target.value)}
                />
                <Button variant='contained' sx={{ width: 'fit-content' }} onClick={saveBranding} disabled={!logo && !footerText && !footerLink}>
                    Save
                </Button>
            </Box>
        </MainCard>
    )
}

export default Branding
