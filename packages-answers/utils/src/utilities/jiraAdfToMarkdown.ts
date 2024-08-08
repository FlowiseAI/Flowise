interface Node {
    type: string
    content?: Node[]
    text?: string
    parent?: {
        type: string
    }
    attrs?: {
        username?: string
        state?: string
        level?: number
        shortName?: string
        url?: string
        type?: string
        altText?: string
        align?: string
    }
}

// export const jirajiraAdfToMarkdown = (node) => {
//   if (!node) return '';

//   if (node.type === 'doc' && node.content) {
//     return node.content.map((item) => `${jirajiraAdfToMarkdown(item)}`).join('');
//   } else if (node.type === 'text') {
//     return node.text;
//   } else if (node.type === 'hardBreak') {
//     return '..';
//   } else if (node.type === 'mention') {
//     return `@${node.attrs.username}`;
//   } else if (node.type === 'taskList') {
//     return node.content.map((item) => `${jirajiraAdfToMarkdown(item)}`).join(',');
//   } else if (node.type === 'taskItem' && node.content) {
//     return node.content.map((item) => `- (${attrs?.state}) ${jirajiraAdfToMarkdown(item)}`).join(',');
//   } else if (node.type === 'emoji') {
//     return ''; //`:${node.attrs.shortName}:`;
//   } else if (node.type === 'link') {
//     return `[${node.text}](${node.attrs.url})`;
//   } else if (node.type === 'mediaGroup' && node.content) {
//     return node.content.map(jirajiraAdfToMarkdown).join('');
//   } else if (node.type === 'paragraph' && node.content) {
//     return `${node.content.map(jirajiraAdfToMarkdown).join('')}`;
//   } else if (node.type === 'bulletList' && node.content) {
//     return node.content.map((item) => `${jirajiraAdfToMarkdown(item)}`).join(',');
//   } else if (node.type === 'listItem' && node.content) {
//     return node.content.map((item) => `- ${jirajiraAdfToMarkdown(item)}`).join(',');
//   } else if (node.type === 'orderedList' && node.content) {
//     return node.content.map((item, index) => `${index + 1}. ${jirajiraAdfToMarkdown(item)}`).join('');
//   } else if (node.type === 'heading' && node.content) {
//     return `\n${'#'.repeat(node.attrs.level)} ${node.content.map(jirajiraAdfToMarkdown).join('')}\n`;
//   } else if (node.type === 'codeBlock') {
//     return `\`\`\`\n${node.text}\n\`\`\`\n`;
//   } else if (node.type === 'blockquote' && node.content) {
//     return `> ${node.content.map(jirajiraAdfToMarkdown).join('')}\n`;
//   } else if (node.type === 'panel' && node.content) {
//     return `\n${node.content.map(jirajiraAdfToMarkdown).join('')}\n`;
//   } else {
//     return '';
//   }
// };

export const jiraAdfToMarkdown = (node: Node): string => {
    if (!node) return ''

    switch (node.type) {
        case 'doc':
            return node.content?.map((item) => jiraAdfToMarkdown(item)).join('') || ''

        case 'paragraph':
            return !node.content ? '' : `${node.content?.map((item) => jiraAdfToMarkdown(item)).join('')}\n\n`

        case 'text':
            return node.text || ''

        case 'hardBreak':
            return '  \n'

        case 'mention':
            return `@${node.attrs?.username || ''}`

        // case 'emoji':
        //   return `:${node.attrs?.shortName || ''}:`;

        case 'link':
            return `[${node.text || ''}](${node.attrs?.url || ''})`

        case 'bulletList':
        case 'taskList':
            return node.content?.map((item) => jiraAdfToMarkdown(item)).join('') || ''

        case 'orderedList':
            return node.content?.map((item, index) => `${index + 1}. ${jiraAdfToMarkdown(item)}`).join('') || ''

        case 'listItem':
            if (node.parent?.type === 'taskList') {
                const checkbox = node.attrs?.state === 'DONE' ? '[x]' : '[ ]'
                return `  * ${checkbox} ${node.content?.map((item) => jiraAdfToMarkdown(item)).join('')}\n`
            } else {
                return `  * ${node.content?.map((item) => jiraAdfToMarkdown(item)).join('')}\n`
            }

        case 'heading':
            return `${'#'.repeat(node.attrs?.level || 1)} ${node.content?.map((item) => jiraAdfToMarkdown(item)).join('')}\n\n`

        case 'blockquote':
            return `> ${node.content?.map((item) => jiraAdfToMarkdown(item)).join('')}\n`

        case 'codeBlock':
            if (node.text) {
                return `\`\`\`\n${node.text || ''}\n\`\`\`\n\n`
            } else {
                return `\`\`\`\n${node.content?.map((item) => jiraAdfToMarkdown(item)).join('')}}\n\`\`\`\n\n`
            }

        case 'mediaGroup':
            return node.content?.map((item) => jiraAdfToMarkdown(item)).join('') || ''

        case 'media':
            return `!${node.attrs?.type === 'external' ? `[${node.attrs?.altText || ''}](${node.attrs?.url || ''})` : ''}`

        case 'table':
            const header = node.content?.find((item) => item.type === 'tableHeader')
            const rows = node.content?.filter((item) => item.type === 'tableRow')
            const separator = header ? `${'|'.repeat(header.content?.length || 0)}\n` : ''
            const headerRow = header ? `| ${header.content?.map((item) => jiraAdfToMarkdown(item)).join(' | ')} |\n${separator}` : ''
            const body = rows?.map((row) => `| ${row.content?.map((item) => jiraAdfToMarkdown(item)).join(' | ')} |\n`).join('')
            return `${headerRow}${body}`

        case 'tableCell':
            const content = node.content?.map((item) => jiraAdfToMarkdown(item)).join('') || ''
            const isHeader = node.parent?.type === 'tableHeader'
            const tcSeparator: string = isHeader ? '---' : '   '
            const padding = isHeader ? ':' : ' '
            return ` ${padding}${content.padEnd(tcSeparator.length, ' ')}${padding}${tcSeparator}`

        default:
            return ''
    }
}
