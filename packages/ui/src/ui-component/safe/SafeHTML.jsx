import PropTypes from 'prop-types'
import DOMPurify from 'dompurify'

/**
 * SafeHTML component that sanitizes HTML content before rendering
 */
export const SafeHTML = ({ html, allowedTags, allowedAttributes, ...props }) => {
    // Configure DOMPurify options
    const config = {
        ALLOWED_TAGS: allowedTags || [
            'p',
            'br',
            'strong',
            'em',
            'u',
            'i',
            'b',
            'h1',
            'h2',
            'h3',
            'h4',
            'h5',
            'h6',
            'ul',
            'ol',
            'li',
            'blockquote',
            'pre',
            'code',
            'a',
            'img',
            'table',
            'thead',
            'tbody',
            'tr',
            'th',
            'td',
            'div',
            'span'
        ],
        ALLOWED_ATTR: allowedAttributes || ['href', 'title', 'alt', 'src', 'class', 'id', 'style'],
        ALLOW_DATA_ATTR: false,
        FORBID_SCRIPT: true,
        FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input'],
        FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover']
    }

    // Sanitize the HTML content
    const sanitizedHTML = DOMPurify.sanitize(html || '', config)

    return <div {...props} dangerouslySetInnerHTML={{ __html: sanitizedHTML }} />
}

SafeHTML.propTypes = {
    html: PropTypes.string.isRequired,
    allowedTags: PropTypes.arrayOf(PropTypes.string),
    allowedAttributes: PropTypes.arrayOf(PropTypes.string)
}
