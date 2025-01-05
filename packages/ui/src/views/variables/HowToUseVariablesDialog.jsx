import PropTypes from 'prop-types'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CodeEditor } from '@/ui-component/editor/CodeEditor'

const overrideConfig = `{
    overrideConfig: {
        vars: {
            var1: 'abc'
        }
    }
}`

const HowToUseVariablesDialog = ({ show, onCancel }) => {
    return (
        <Dialog onClose={onCancel} open={show}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>How To Use Variables</DialogTitle>
                </DialogHeader>
                <p className='mb-2'>
                    Variables can be used in Custom Tool, Custom Function, Custom Loader, If Else Function with the $ prefix.
                </p>
                <CodeEditor
                    disabled={true}
                    value={`$vars.<variable-name>`}
                    height={'50px'}
                    theme={'dark'}
                    lang={'js'}
                    basicSetup={{ highlightActiveLine: false, highlightActiveLineGutter: false }}
                />
                <p className='mb-2'>
                    Variables can also be used in Text Field parameter of any node. For example, in System Message of Agent:
                </p>
                <CodeEditor
                    disabled={true}
                    value={`You are a {{$vars.personality}} AI assistant`}
                    height={'50px'}
                    theme={'dark'}
                    lang={'js'}
                    basicSetup={{ highlightActiveLine: false, highlightActiveLineGutter: false }}
                />
                <p className='mb-2'>
                    If variable type is Static, the value will be retrieved as it is. If variable type is Runtime, the value will be
                    retrieved from .env file.
                </p>
                <p className='mb-2'>
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
    )
}

HowToUseVariablesDialog.propTypes = {
    show: PropTypes.bool,
    onCancel: PropTypes.func
}

export default HowToUseVariablesDialog
