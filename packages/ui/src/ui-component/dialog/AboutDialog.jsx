import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { Box, Divider } from '@mui/material'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import moment from 'moment'
import axios from 'axios'
import { baseURL } from '@/store/constant'
import Logo from '../extended/Logo'
import { Button } from '@/components/ui/button'

const AboutDialog = ({ show, onCancel }) => {
    const [data, setData] = useState({})
    const currentVersion = data?.currentVersion
    const latestVersion = data?.name?.replace('flowise@', '')

    useEffect(() => {
        if (show) {
            const username = localStorage.getItem('username')
            const password = localStorage.getItem('password')

            const config = {}
            if (username && password) {
                config.auth = {
                    username,
                    password
                }
                config.headers = {
                    'Content-type': 'application/json',
                    'x-request-from': 'internal'
                }
            }
            const latestReleaseReq = axios.get('https://api.github.com/repos/FlowiseAI/Flowise/releases/latest')
            const currentVersionReq = axios.get(`${baseURL}/api/v1/version`, { ...config })

            Promise.all([latestReleaseReq, currentVersionReq])
                .then(([latestReleaseData, currentVersionData]) => {
                    const finalData = {
                        ...latestReleaseData.data,
                        currentVersion: currentVersionData.data.version
                    }
                    setData(finalData)
                })
                .catch((error) => {
                    console.error('Error fetching data:', error)
                })
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show])

    return (
        <Dialog open={show} onClose={onCancel}>
            <DialogContent className='p-0'>
                <Box className='w-full flex flex-col items-center justify-center gap-2'>
                    <Box className='w-full flex flex-col items-center justify-center gap-2 p-6'>
                        <Logo />
                        <span>{`v${currentVersion}`}</span>
                    </Box>
                    <Divider className='w-full mx-2 bg-sidebar-border' />
                    <Box className='w-full flex items-center justify-between gap-4 p-6'>
                        <span>{`${
                            currentVersion !== latestVersion
                                ? `FlowiseAI v${latestVersion} is now available.`
                                : `You're on the latest version.`
                        } Published ${moment(data.published_at).fromNow()}.`}</span>
                        <a href='https://github.com/FlowiseAI/Flowise/releases' rel='noreferrer' target='_blank'>
                            <Button size='sm' variant='secondary'>
                                Changelog
                            </Button>
                        </a>
                    </Box>
                </Box>
            </DialogContent>
        </Dialog>
    )
}

AboutDialog.propTypes = {
    show: PropTypes.bool,
    onCancel: PropTypes.func
}

export default AboutDialog
