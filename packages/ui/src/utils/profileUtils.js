import { exportData, stringify } from '@/utils/exportImport'
import { REMOVE_DIRTY } from '@/store/actions'
import { Button } from '@mui/material'
import { IconX } from '@tabler/icons-react'
import { getErrorMessage } from '@/utils/errorHandler'

/**
 * Handle file change for import
 * @param {Event} e - File input change event
 * @param {Function} importAllApi - Import API function
 * @returns {void}
 */
export const handleFileChange = (e, importAllApi) => {
    if (!e.target.files) return

    const file = e.target.files[0]

    const reader = new FileReader()
    reader.onload = (evt) => {
        if (!evt?.target?.result) {
            return
        }
        const body = JSON.parse(evt.target.result)
        importAllApi.request(body)
    }
    reader.readAsText(file)
}

/**
 * Handle import success
 * @param {Function} dispatch - Redux dispatch
 * @param {Function} enqueueSnackbar - Snackbar action
 * @param {Function} closeSnackbar - Snackbar close action
 * @param {Function} navigate - Navigation function
 * @returns {void}
 */
export const handleImportSuccess = (dispatch, enqueueSnackbar, closeSnackbar, navigate) => {
    dispatch({ type: REMOVE_DIRTY })
    enqueueSnackbar({
        message: `Import All successful`,
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
    // Refresh the page
    navigate(0)
}

/**
 * Handle export data
 * @param {Array} selectedData - Array of selected data types
 * @returns {Object} Body object for export API
 */
export const prepareExportData = (selectedData) => {
    const body = {}
    if (selectedData.includes('Chatflows')) body.chatflow = true
    if (selectedData.includes('Agentflows')) body.agentflow = true
    if (selectedData.includes('Tools')) body.tool = true
    if (selectedData.includes('Variables')) body.variable = true
    if (selectedData.includes('Assistants')) body.assistant = true
    return body
}

/**
 * Process and download exported data
 * @param {Object} data - The exported data
 * @param {Function} errorFailed - Function to handle errors
 * @returns {void}
 */
export const processExportedData = (data, errorFailed) => {
    try {
        const dataStr = stringify(exportData(data))
        const blob = new Blob([dataStr], { type: 'application/json' })
        const dataUri = URL.createObjectURL(blob)

        const linkElement = document.createElement('a')
        linkElement.setAttribute('href', dataUri)
        linkElement.setAttribute('download', data.FileDefaultName)
        linkElement.click()
    } catch (error) {
        errorFailed(`Failed to export all: ${getErrorMessage(error)}`)
    }
}

/**
 * Show error notification
 * @param {string} message - Error message to display
 * @param {Function} enqueueSnackbar - Snackbar action
 * @param {Function} closeSnackbar - Snackbar close action
 * @returns {void}
 */
export const showErrorNotification = (message, enqueueSnackbar, closeSnackbar) => {
    enqueueSnackbar({
        message: message,
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
