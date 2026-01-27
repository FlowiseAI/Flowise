import { mapExtToInputField, mapMimeTypeToInputField } from 'flowise-components'

export function fileMappingTest() {
    describe('File Input Field Mapping', () => {
        describe('Extension-based mapping', () => {
            it('should map .pdf extension to pdfFile', () => {
                const result = mapExtToInputField('.pdf')
                expect(result).toEqual('pdfFile')
            })

            it('should map .docx extension to docxFile', () => {
                const result = mapExtToInputField('.docx')
                expect(result).toEqual('docxFile')
            })

            it('should map .xlsx extension to csvFile', () => {
                const result = mapExtToInputField('.xlsx')
                expect(result).toEqual('csvFile')
            })

            it('should return txtFile for unknown extensions', () => {
                const result = mapExtToInputField('.unknown')
                expect(result).toEqual('txtFile')
            })
        })

        describe('MIME type-based mapping', () => {
            it('should map application/pdf to pdfFile', () => {
                const result = mapMimeTypeToInputField('application/pdf')
                expect(result).toEqual('pdfFile')
            })

            it('should map Word document MIME types to docxFile', () => {
                expect(mapMimeTypeToInputField('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toEqual(
                    'docxFile'
                )
                expect(mapMimeTypeToInputField('application/msword')).toEqual('docxFile')
            })

            it('should map Excel MIME types to excelFile', () => {
                expect(mapMimeTypeToInputField('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')).toEqual(
                    'excelFile'
                )
                expect(mapMimeTypeToInputField('application/vnd.ms-excel')).toEqual('excelFile')
            })

            it('should return txtFile for unknown MIME types', () => {
                const result = mapMimeTypeToInputField('application/unknown')
                expect(result).toEqual('txtFile')
            })
        })

        describe('Fallback logic (regression test for PDF bug)', () => {
            it('should correctly handle PDF files using fallback logic', () => {
                // Simulate the file input field determination logic
                const fileExtension = '.pdf'
                const mimeType = 'application/pdf'

                // Try extension first
                let fileInputField = mapExtToInputField(fileExtension)

                // Fall back to MIME type if extension returns txtFile
                if (fileInputField === 'txtFile') {
                    fileInputField = mapMimeTypeToInputField(mimeType)
                }

                // PDF should be correctly mapped to pdfFile
                expect(fileInputField).toEqual('pdfFile')
            })

            it('should correctly handle Word documents using extension', () => {
                const fileExtension = '.docx'
                const mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

                let fileInputField = mapExtToInputField(fileExtension)
                if (fileInputField === 'txtFile') {
                    fileInputField = mapMimeTypeToInputField(mimeType)
                }

                expect(fileInputField).toEqual('docxFile')
            })

            it('should correctly handle Excel documents using extension', () => {
                const fileExtension = '.xlsx'
                const mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

                let fileInputField = mapExtToInputField(fileExtension)
                if (fileInputField === 'txtFile') {
                    fileInputField = mapMimeTypeToInputField(mimeType)
                }

                expect(fileInputField).toEqual('csvFile')
            })

            it('should fall back to MIME type for unrecognized extensions', () => {
                const fileExtension = '.unknown'
                const mimeType = 'application/pdf'

                let fileInputField = mapExtToInputField(fileExtension)
                if (fileInputField === 'txtFile') {
                    fileInputField = mapMimeTypeToInputField(mimeType)
                }

                // Should use MIME type fallback and detect it as PDF
                expect(fileInputField).toEqual('pdfFile')
            })
        })
    })
}
