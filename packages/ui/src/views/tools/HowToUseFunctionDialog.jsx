import { createPortal } from 'react-dom'
import PropTypes from 'prop-types'
import { Dialog, DialogContent, DialogTitle } from '@mui/material'

const HowToUseFunctionDialog = ({ show, onCancel }) => {
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
                Как использовать функцию
            </DialogTitle>
            <DialogContent>
                <ul>
                    <li style={{ marginTop: 10 }}>Вы можете использовать любые библиотеки, импортированные во StartAI.</li>
                    <li style={{ marginTop: 10 }}>
                        You can use properties specified in Input Schema as variables with prefix $:
                        <ul style={{ marginTop: 10 }}>
                            <li>
                                Свойство = <code>userid</code>
                            </li>
                            <li>
                                Переменная = <code>$userid</code>
                            </li>
                        </ul>
                    </li>
                    <li style={{ marginTop: 10 }}>
                        Вы можете получить конфигурацию потока по умолчанию:
                        <ul style={{ marginTop: 10 }}>
                            <li>
                                <code>$flow.sessionId</code>
                            </li>
                            <li>
                                <code>$flow.chatId</code>
                            </li>
                            <li>
                                <code>$flow.chatflowId</code>
                            </li>
                            <li>
                                <code>$flow.input</code>
                            </li>
                            <li>
                                <code>$flow.state</code>
                            </li>
                        </ul>
                    </li>
                    <li style={{ marginTop: 10 }}>
                        Вы можете получить пользовательские переменные:&nbsp;<code>{`$vars.<variable-name>`}</code>
                    </li>
                    <li style={{ marginTop: 10 }}>Должно возвращать строковое значение в конце функции</li>
                </ul>
            </DialogContent>
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

HowToUseFunctionDialog.propTypes = {
    show: PropTypes.bool,
    onCancel: PropTypes.func
}

export default HowToUseFunctionDialog
