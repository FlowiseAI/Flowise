import { createPortal } from 'react-dom'
import PropTypes from 'prop-types'
import rehypeMathjax from 'rehype-mathjax'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import { MemoizedReactMarkdown } from '@/ui-component/markdown/MemoizedReactMarkdown'
import { CodeBlock } from '@/ui-component/markdown/CodeBlock'
import { Dialog, DialogContent, DialogTitle } from '@mui/material'

const InputHintDialog = ({ show, dialogProps, onCancel }) => {
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
                {dialogProps.label}
            </DialogTitle>
            <DialogContent>
                <MemoizedReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeMathjax, rehypeRaw]}
                    components={{
                        code({ inline, className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || '')
                            return !inline ? (
                                <CodeBlock
                                    isDialog={true}
                                    language={(match && match[1]) || ''}
                                    value={String(children).replace(/\n$/, '')}
                                    {...props}
                                />
                            ) : (
                                <code className={className} {...props}>
                                    {children}
                                </code>
                            )
                        }
                    }}
                >
                    {dialogProps?.value}
                </MemoizedReactMarkdown>
            </DialogContent>
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

InputHintDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func
}

export default InputHintDialog
