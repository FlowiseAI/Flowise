import { createPortal } from 'react-dom'
import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { Dialog, DialogContent, DialogTitle, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Paper } from '@mui/material'
import moment from 'moment'
import axios from 'axios'
import { baseURL } from '@/store/constant'

const AboutDialog = ({ show, onCancel }) => {
    const portalElement = document.getElementById('portal')

    const [data, setData] = useState({})

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
            }
            const currentVersionReq = axios.get(`${baseURL}/api/v1/version`, { ...config })

            Promise.all([currentVersionReq])
                .then(([currentVersionData]) => {
                    const finalData = {
                        name: '24.1',
                        html_url: 'https://docs-symphony.zendesk.com/hc/en-us/sections/25422182631693',
                        currentVersion: currentVersionData.data.version,
                        published_at: 'April 15, 2024'
                    }
                    setData(finalData)
                })
                .catch((error) => {
                    console.error('Error fetching data:', error)
                })
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show])

    const component = show ? (
        <Dialog
            onClose={onCancel}
            open={show}
            fullWidth
            maxWidth='sm'
            aria-labelledby='alert-dialog-title'
            aria-describedby='alert-dialog-description'
        >
            <DialogTitle sx={{ fontSize: '1rem' }} id='alert-dialog-title'>
                Version
            </DialogTitle>
            <DialogContent>
                {data && (
                    <TableContainer component={Paper}>
                        <Table aria-label='simple table'>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Flowise Version</TableCell>
                                    <TableCell>Logi Symphony Version</TableCell>
                                    <TableCell>Published At</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                <TableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                    <TableCell component='th' scope='row'>
                                        {data.currentVersion}
                                    </TableCell>
                                    <TableCell component='th' scope='row'>
                                        <a target='_blank' rel='noreferrer' href={data.html_url}>
                                            {data.name}
                                        </a>
                                    </TableCell>
                                    <TableCell>{moment(data.published_at).fromNow()}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </DialogContent>
            <DialogContent>
                <a style={{ display: 'flex', justifyContent: 'center' }} target='_blank' rel='noreferrer' href='https://www.flowiseai.com/'>
                    Powered by Flowise
                </a>
            </DialogContent>
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

AboutDialog.propTypes = {
    show: PropTypes.bool,
    onCancel: PropTypes.func
}

export default AboutDialog
