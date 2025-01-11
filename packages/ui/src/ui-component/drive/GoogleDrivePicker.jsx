import PropTypes from 'prop-types'
import { useEffect, useState } from 'react'
import { Button } from '@mui/material'
import useApi from '@/hooks/useApi'
import credentialsApi from '@/api/credentials'

export const GoogleDrivePicker = ({ onChange, value, disabled, credentialId, credentialData, handleCredentialDataChange }) => {
    const [pickerInited, setPickerInited] = useState(false)
    const [selectedFiles, setSelectedFiles] = useState([])
    const [accessToken, setAccessToken] = useState(null)
    const getCredentialDataApi = useApi(credentialsApi.getSpecificCredential)

    useEffect(() => {
        if (credentialId) {
            getCredentialDataApi.request(credentialId)
        }
    }, [credentialId])

    useEffect(() => {
        if (getCredentialDataApi.data) {
            setAccessToken(getCredentialDataApi.data?.plainDataObj.googleAccessToken ?? '')
            handleCredentialDataChange(getCredentialDataApi.data)
        }
    }, [getCredentialDataApi.data])

    useEffect(() => {
        if (!accessToken) return

        // Load the Google Client and Picker libraries
        const script1 = document.createElement('script')
        script1.src = 'https://apis.google.com/js/api.js'
        script1.async = true
        script1.defer = true
        script1.onload = () => loadGAPIClient()

        const script2 = document.createElement('script')
        script2.src = 'https://accounts.google.com/gsi/client'
        script2.async = true
        script2.defer = true

        document.body.appendChild(script1)
        document.body.appendChild(script2)

        // Initialize selected files from value if it exists
        if (value) {
            try {
                const files = JSON.parse(value)
                setSelectedFiles(files)
            } catch (e) {
                console.error('Error parsing selected files:', e)
            }
        }

        return () => {
            document.body.removeChild(script1)
            document.body.removeChild(script2)
        }
    }, [value, accessToken])

    const loadGAPIClient = () => {
        window.gapi.load('picker', () => {
            setPickerInited(true)
        })
    }
    // console.log('accessToken=>', import.meta.env.VITE_PORT)
    // console.log('accessToken=>', process.env.VITE_PORT)
    // console.log('accessToken=>', process.env.REACT_APP_GOOGLE_PICKER_API_KEY)

    const createPicker = async () => {
        if (!accessToken) {
            console.error('No access token available')
            return
        }

        try {
            const view = new window.google.picker.View(window.google.picker.ViewId.DOCS)
            view.setMimeTypes(
                'application/vnd.google-apps.document,' +
                    'application/vnd.google-apps.spreadsheet,' +
                    'application/pdf,' +
                    'text/csv,' +
                    'application/csv,' +
                    'text/comma-separated-values,' +
                    'application/vnd.ms-excel,' +
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )

            const picker = new window.google.picker.PickerBuilder()
                .enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED)
                .setDeveloperKey(process.env.NEXT_PUBLIC_GOOGLE_DEVELOPER_KEY)
                .setAppId(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID)
                .setOAuthToken(accessToken)
                .addView(view)
                .setCallback(pickerCallback)
                .build()

            picker.setVisible(true)
        } catch (error) {
            console.error('Error creating picker:', error)
        }
    }

    const pickerCallback = (data) => {
        if (data.action === window.google.picker.Action.PICKED) {
            const files = data.docs
            setSelectedFiles(files)
            onChange(JSON.stringify(files.map((file) => file.id)))
        }
    }

    return (
        <div style={{ margin: '20px 0px' }}>
            <Button variant='outlined' onClick={createPicker} disabled={!pickerInited || disabled}>
                Select Files from Google Drive
            </Button>
            {selectedFiles.length > 0 && (
                <div style={{ marginTop: '10px' }}>
                    <strong>Selected files:</strong>
                    <ul>
                        {selectedFiles.map((file) => (
                            <li key={file.id}>{file.name}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    )
}

GoogleDrivePicker.propTypes = {
    onChange: PropTypes.func.isRequired,
    value: PropTypes.string,
    disabled: PropTypes.bool,
    credentialId: PropTypes.string.isRequired,
    credentialData: PropTypes.object,
    handleCredentialDataChange: PropTypes.func
}
