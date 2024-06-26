import { Block, Inline, Node, helpers } from '@contentful/rich-text-types'

interface IField {
    [key: string]: any
}

interface IContentObject {
    fields: IField
    sys: any // Adjust this type according to your sys object structure
}

export function convertEntryToPlainText(contentObject: IContentObject, fieldsToParse?: string[], richTextParsingRules?: any): string {
    const { fields } = contentObject
    const fieldsToProcess = fieldsToParse || []

    return Object.entries(fields)
        .filter(([fieldName]) => fieldsToProcess.includes(fieldName))
        .map(([fieldName, fieldValue]) => {
            // Check if the field is a rich text field
            if (typeof fieldValue === 'object' && fieldValue.nodeType === 'document') {
                let plainText = documentToPlainTextString(fieldValue, '\n', richTextParsingRules)

                const safePlainText = plainText.replaceAll('"', '')
                return `${fieldName}: ${safePlainText}\n\n`
            } else if (typeof fieldValue === 'string') {
                const cleanedValue = fieldValue.replaceAll('"', '')
                return `${fieldName}: ${cleanedValue}\n\n`
            } else if (typeof fieldValue === 'object' && fieldValue.sys && fieldValue.fields) {
                // Handle references to other entries and assets
                // You might need to adjust this part based on the structure of your sys object
                let linkedSingleItemText = ''
                if (fieldValue.sys.type === 'Entry') {
                    linkedSingleItemText = convertEntryToPlainText(
                        fieldValue,
                        richTextParsingRules.embeddedContentTypes[fieldValue.sys.contentType.sys.id],
                        richTextParsingRules
                    )
                } else if (fieldValue.sys.type === 'Asset') {
                    linkedSingleItemText = `![${fieldValue.fields.title}](${fieldValue.fields.file.url})`
                }

                return `${fieldName}: ${linkedSingleItemText}\n\n`
            } else if (typeof fieldValue === 'object' && Array.isArray(fieldValue)) {
                // Handle array fields
                const arrayText = fieldValue
                    .map((item: any) => {
                        if (typeof item === 'object' && item.sys && item.fields) {
                            const linkedArrayItemText = convertEntryToPlainText(
                                item,
                                richTextParsingRules.embeddedContentTypes[item.sys.contentType.sys.id],
                                richTextParsingRules
                            )
                            return linkedArrayItemText
                        } else {
                            return item
                        }
                    })
                    .join(', ')
                return `${fieldName}: ${arrayText}\n\n`
            }

            // TODO: Return empty for now, handle other types as needed
            return ``
        })
        .join('')
}

export function documentToPlainTextString(rootNode: Block | Inline, blockDivisor: string = ' ', parsingRules: any = {}): string {
    if (!rootNode || !rootNode.content || !Array.isArray(rootNode.content)) {
        /**
         * Handles edge cases, such as when the value is not set in the CMA or the
         * field has not been properly validated, e.g. because of a user extension.
         * Note that we are nevertheless strictly type-casting `rootNode` as
         * Block | Inline. Valid rich text documents (and their branch block nodes)
         * should never lack a Node[] `content` property.
         */
        return ''
    }

    return (rootNode as Block).content.reduce((acc: string, node: Node, i: number): string => {
        let nodeTextValue: string = ''

        // Check against parsing rules before processing the node
        if (node.nodeType in parsingRules && parsingRules[node.nodeType] === false) {
            // Skip processing this node as per the parsing rules
            return acc
        }

        if (helpers.isText(node)) {
            nodeTextValue = node.value
        } else if (helpers.isBlock(node) || helpers.isInline(node)) {
            if (node.nodeType === 'embedded-asset-block') {
                nodeTextValue = `![${node.data.target.fields.title}](https:${node.data.target.fields.file.url})`
            } else if (node.nodeType === 'embedded-entry-block' || node.nodeType === 'embedded-entry-inline') {
                // Assuming node.data.target contains the content object for the embedded entry
                const embeddedContentObject = node.data.target
                // Call processContentObject on the embedded content object
                // You might need to adjust how you access the configuration for specific content types
                try {
                    if (parsingRules?.embeddedContentTypes[embeddedContentObject?.sys?.contentType?.sys?.id]) {
                        nodeTextValue = convertEntryToPlainText(
                            embeddedContentObject,
                            parsingRules.embeddedContentTypes[embeddedContentObject.sys.contentType.sys.id],
                            parsingRules
                        )
                    } else {
                        nodeTextValue = documentToPlainTextString(node, blockDivisor, parsingRules)
                    }
                } catch (err: any) {
                    console.error(`Error processing embedded entry: ${err.message}`)
                }
            } else {
                nodeTextValue = documentToPlainTextString(node, blockDivisor, parsingRules)
            }
            if (!nodeTextValue.length) {
                return acc
            }
        }

        const nextNode = rootNode.content[i + 1]
        const isNextNodeBlock = nextNode && helpers.isBlock(nextNode)
        const divisor = isNextNodeBlock ? blockDivisor : ''
        return acc + nodeTextValue + divisor
    }, '')
}
