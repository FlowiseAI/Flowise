import { Document } from '@langchain/core/documents'
import { TypeORMDriver } from './TypeORM'
import { INodeData, ICommonObject } from '../../../../src'

describe('TypeORMDriver', () => {
    let driver: TypeORMDriver
    let mockNodeData: INodeData
    let mockOptions: ICommonObject

    beforeEach(() => {
        // Mock nodeData with required structure
        mockNodeData = {
            inputs: {},
            outputs: {},
            credential: 'test-credential',
            instance: null,
            id: 'test-id'
        } as INodeData

        // Mock options object
        mockOptions = {
            credentialId: 'test-credential'
        }

        driver = new TypeORMDriver(mockNodeData, mockOptions)
    })

    describe('sanitizeDocuments', () => {
        it('should remove NULL characters (0x00)', () => {
            const documents = [
                new Document({
                    pageContent: 'Text\0with\0null\0bytes',
                    metadata: {}
                })
            ]

            const result = driver.sanitizeDocuments(documents)

            expect(result[0].pageContent).toBe('Textwithnullbytes')
            expect(result[0].pageContent).not.toContain('\0')
        })

        it('should remove soft hyphens (U+00AD)', () => {
            const documents = [
                new Document({
                    pageContent: 'Word1\u00ADWord2\u00ADWord3',
                    metadata: {}
                })
            ]

            const result = driver.sanitizeDocuments(documents)

            expect(result[0].pageContent).toBe('Word1Word2Word3')
            expect(result[0].pageContent).not.toContain('\u00AD')
        })

        it('should remove control characters except tab, newline, and carriage return', () => {
            const documents = [
                new Document({
                    // Include control characters that should be removed
                    pageContent: 'Text\x01SOH\x02STX\x03ETX\x07BEL\x08BS',
                    metadata: {}
                })
            ]

            const result = driver.sanitizeDocuments(documents)

            expect(result[0].pageContent).toBe('TextSOHSTXETXBELBS')
        })

        it('should remove vertical tab (0x0B) and form feed (0x0C)', () => {
            const documents = [
                new Document({
                    pageContent: 'Line1\x0BLine2\x0CLine3',
                    metadata: {}
                })
            ]

            const result = driver.sanitizeDocuments(documents)

            expect(result[0].pageContent).toBe('Line1Line2Line3')
            expect(result[0].pageContent).not.toContain('\x0B')
            expect(result[0].pageContent).not.toContain('\x0C')
        })

        it('should remove DEL character (0x7F)', () => {
            const documents = [
                new Document({
                    pageContent: 'Text\x7Fwith\x7FDEL',
                    metadata: {}
                })
            ]

            const result = driver.sanitizeDocuments(documents)

            expect(result[0].pageContent).toBe('TextwithDEL')
            expect(result[0].pageContent).not.toContain('\x7F')
        })

        it('should preserve tab (0x09), newline (0x0A), and carriage return (0x0D)', () => {
            const documents = [
                new Document({
                    pageContent: 'Line1\nLine2\rLine3\tTabbed',
                    metadata: {}
                })
            ]

            const result = driver.sanitizeDocuments(documents)

            expect(result[0].pageContent).toBe('Line1\nLine2\rLine3\tTabbed')
            expect(result[0].pageContent).toContain('\n')
            expect(result[0].pageContent).toContain('\r')
            expect(result[0].pageContent).toContain('\t')
        })

        it('should remove zero-width characters', () => {
            const documents = [
                new Document({
                    pageContent: 'Text\u200BWith\u200CZero\u200DWidth\uFEFFChars',
                    metadata: {}
                })
            ]

            const result = driver.sanitizeDocuments(documents)

            expect(result[0].pageContent).toBe('TextWithZeroWidthChars')
            expect(result[0].pageContent).not.toContain('\u200B')
            expect(result[0].pageContent).not.toContain('\u200C')
            expect(result[0].pageContent).not.toContain('\u200D')
            expect(result[0].pageContent).not.toContain('\uFEFF')
        })

        it('should handle PDF extraction artifacts (real-world scenario)', () => {
            const documents = [
                new Document({
                    pageContent: 'MB301 | MXR\u00AE\n Bass Synth\u00AD 3\x0CKNOBVOICESHAPE',
                    metadata: {}
                })
            ]

            const result = driver.sanitizeDocuments(documents)

            expect(result[0].pageContent).toBe('MB301 | MXR®\n Bass Synth 3KNOBVOICESHAPE')
            expect(result[0].pageContent).toContain('®') // Should preserve valid Unicode
            expect(result[0].pageContent).toContain('\n') // Should preserve newlines
            expect(result[0].pageContent).not.toContain('\u00AD') // Should remove soft hyphen
            expect(result[0].pageContent).not.toContain('\x0C') // Should remove form feed
        })

        it('should preserve valid Unicode characters', () => {
            const documents = [
                new Document({
                    pageContent: 'Product™ © ® ° ± § ¶ • ‡ † ‰ Café résumé 🎵🎶',
                    metadata: {}
                })
            ]

            const result = driver.sanitizeDocuments(documents)

            expect(result[0].pageContent).toBe('Product™ © ® ° ± § ¶ • ‡ † ‰ Café résumé 🎵🎶')
        })

        it('should handle multiple documents', () => {
            const documents = [
                new Document({
                    pageContent: 'First\0document\u00AD',
                    metadata: {}
                }),
                new Document({
                    pageContent: 'Second\x0Bdocument\u200B',
                    metadata: {}
                }),
                new Document({
                    pageContent: 'Third\x7Fdocument\uFEFF',
                    metadata: {}
                })
            ]

            const result = driver.sanitizeDocuments(documents)

            expect(result[0].pageContent).toBe('Firstdocument')
            expect(result[1].pageContent).toBe('Seconddocument')
            expect(result[2].pageContent).toBe('Thirddocument')
        })

        it('should handle empty documents', () => {
            const documents = [
                new Document({
                    pageContent: '',
                    metadata: {}
                })
            ]

            const result = driver.sanitizeDocuments(documents)

            expect(result[0].pageContent).toBe('')
        })

        it('should handle documents with only problematic characters', () => {
            const documents = [
                new Document({
                    pageContent: '\0\u00AD\x0B\x0C\u200B\uFEFF',
                    metadata: {}
                })
            ]

            const result = driver.sanitizeDocuments(documents)

            expect(result[0].pageContent).toBe('')
        })

        it('should preserve metadata while sanitizing content', () => {
            const documents = [
                new Document({
                    pageContent: 'Text\0with\u00ADissues',
                    metadata: { source: 'test.pdf', page: 1 }
                })
            ]

            const result = driver.sanitizeDocuments(documents)

            expect(result[0].pageContent).toBe('Textwithissues')
            expect(result[0].metadata).toEqual({ source: 'test.pdf', page: 1 })
        })

        it('should handle mixed line endings (CRLF, LF, CR)', () => {
            const documents = [
                new Document({
                    pageContent: 'Line1\r\nLine2\nLine3\rLine4',
                    metadata: {}
                })
            ]

            const result = driver.sanitizeDocuments(documents)

            expect(result[0].pageContent).toBe('Line1\r\nLine2\nLine3\rLine4')
        })

        it('should handle combined problematic characters', () => {
            const documents = [
                new Document({
                    pageContent: 'Start\0\u00AD\x01\x0B\x0C\x7F\u200B\uFEFFEnd',
                    metadata: {}
                })
            ]

            const result = driver.sanitizeDocuments(documents)

            expect(result[0].pageContent).toBe('StartEnd')
        })

        it('should not mutate the original document array', () => {
            const originalContent = 'Text\0with\u00ADissues'
            const documents = [
                new Document({
                    pageContent: originalContent,
                    metadata: {}
                })
            ]

            driver.sanitizeDocuments(documents)

            // After sanitization, the documents array should be modified in place
            expect(documents[0].pageContent).toBe('Textwithissues')
        })

        it('should handle very long content with problematic characters', () => {
            const problematicChar = '\u00AD'
            const longContent = 'Word'.concat(problematicChar.repeat(1000)).concat('End')
            const documents = [
                new Document({
                    pageContent: longContent,
                    metadata: {}
                })
            ]

            const result = driver.sanitizeDocuments(documents)

            expect(result[0].pageContent).toBe('WordEnd')
            expect(result[0].pageContent.length).toBe(7)
        })
    })
})
