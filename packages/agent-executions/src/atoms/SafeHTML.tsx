import DOMPurify from 'dompurify'

interface SafeHTMLProps extends React.HTMLAttributes<HTMLDivElement> {
    html: string
    allowedTags?: string[]
    allowedAttributes?: string[]
}

export const SafeHTML = ({ html, allowedTags, allowedAttributes, ...props }: SafeHTMLProps) => {
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

    const sanitizedHTML = DOMPurify.sanitize(html || '', config)

    return <div {...props} dangerouslySetInnerHTML={{ __html: sanitizedHTML }} />
}
