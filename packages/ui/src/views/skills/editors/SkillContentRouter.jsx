import PropTypes from 'prop-types'
import { forwardRef } from 'react'

import { Box, Typography } from '@mui/material'

import { classifyKind, isImage, isPdf, isVideo } from '../utils/extUtils'
import SkillBinaryViewer from './SkillBinaryViewer'
import SkillCodeEditor from './SkillCodeEditor'
import SkillMarkdownEditor from './SkillMarkdownEditor'
import SkillMediaViewer from './SkillMediaViewer'
import SkillPdfViewer from './SkillPdfViewer'

// Picks the correct editor/viewer for a file node based on its extension.
// Folders and the root pseudo-node are handled by the orchestrator and never
// reach this component.
const SkillContentRouter = forwardRef(
    ({ node, content, onChange, onBlur, disabled, fetchBlob, onRequestInsertFile, onRequestInsertTool, resolveFileName }, ref) => {
        if (!node) {
            return (
                <Box sx={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', p: 3 }}>
                    <Typography variant='body2' color='text.secondary'>
                        Select a file in the tree to start editing.
                    </Typography>
                </Box>
            )
        }

        const kind = classifyKind(node.extension)

        if (kind === 'skill') {
            return (
                <SkillMarkdownEditor
                    ref={ref}
                    value={content}
                    onChange={onChange}
                    onBlur={onBlur}
                    disabled={disabled}
                    placeholder='Write your skill instructions in Markdown. Use the File / Tool buttons above to insert {{skill.*}} or {{tool.*}} references.'
                    onRequestInsertFile={onRequestInsertFile}
                    onRequestInsertTool={onRequestInsertTool}
                    resolveFileName={resolveFileName}
                />
            )
        }

        if (kind === 'code' || kind === 'data') {
            return (
                <SkillCodeEditor
                    value={content}
                    extension={node.extension}
                    onChange={onChange}
                    onBlur={onBlur}
                    disabled={disabled}
                    placeholder={`Edit ${node.extension || 'file'} contents`}
                />
            )
        }

        if (isPdf(node.extension)) {
            return <SkillPdfViewer node={node} fetchBlob={fetchBlob} />
        }

        if (isImage(node.extension) || isVideo(node.extension)) {
            return <SkillMediaViewer node={node} fetchBlob={fetchBlob} />
        }

        return <SkillBinaryViewer node={node} fetchBlob={fetchBlob} />
    }
)

SkillContentRouter.displayName = 'SkillContentRouter'
SkillContentRouter.propTypes = {
    node: PropTypes.object,
    content: PropTypes.string,
    onChange: PropTypes.func,
    onBlur: PropTypes.func,
    disabled: PropTypes.bool,
    fetchBlob: PropTypes.func,
    onRequestInsertFile: PropTypes.func,
    onRequestInsertTool: PropTypes.func,
    resolveFileName: PropTypes.func
}

export default SkillContentRouter
