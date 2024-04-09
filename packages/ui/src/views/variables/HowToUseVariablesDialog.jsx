import { createPortal } from 'react-dom'
import PropTypes from 'prop-types'
import { Dialog, DialogContent, DialogTitle } from '@mui/material'
import { CodeEditor } from '@/ui-component/editor/CodeEditor'

const overrideConfig = `{
    overrideConfig: {
        vars: {
            var1: 'abc'
        }
    }
}`

const HowToUseVariablesDialog = ({ show, onCancel }) => {
    const portalElement = document.getElementById('portal')

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
                How To Use Variables
            </DialogTitle>
            <DialogContent>
                <p style={{ marginBottom: '10px' }}>Variables can be used in Custom Tool Function with the $ prefix.</p>
                <CodeEditor
                    disabled={true}
                    value={`$vars.<variable-name>`}
                    height={'50px'}
                    theme={'dark'}
                    lang={'js'}
                    basicSetup={{ highlightActiveLine: false, highlightActiveLineGutter: false }}
                />
                <p style={{ marginBottom: '10px' }}>
                    If variable type is Static, the value will be retrieved as it is. If variable type is Runtime, the value will be
                    retrieved from .env file.
                </p>
                <p style={{ marginBottom: '10px' }}>
                    You can also override variable values in API overrideConfig using <b>vars</b>:
                </p>
                <CodeEditor
                    disabled={true}
                    value={overrideConfig}
                    height={'170px'}
                    theme={'dark'}
                    lang={'js'}
                    basicSetup={{ highlightActiveLine: false, highlightActiveLineGutter: false }}
                />
                <p>
                    Read more from{' '}
                    <a target='_blank' rel='noreferrer' href='https://docs.flowiseai.com/using-flowise/variables'>
                        docs
                    </a>
                </p>
            </DialogContent>
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

HowToUseVariablesDialog.propTypes = {
    show: PropTypes.bool,
    onCancel: PropTypes.func
}

export default HowToUseVariablesDialog
