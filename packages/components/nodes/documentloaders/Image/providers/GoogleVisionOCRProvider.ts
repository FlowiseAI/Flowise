import { IOCRProvider, OCRProviderOptions } from './IOCRProvider'
import { getCredentialParam } from '../../../../src'

export class GoogleVisionOCRProvider implements IOCRProvider {
    private apiKey: string
    private apiUrl: string

    constructor(options: OCRProviderOptions) {
        this.apiKey = getCredentialParam('googleApiKey', options.credentialData, options.nodeData)
        
        if (!this.apiKey) {
            throw new Error('Google API Key is required for Google Vision OCR')
        }

        this.apiUrl = 'https://vision.googleapis.com/v1/images:annotate'
    }

    async extractText(buffer: Buffer, filename: string): Promise<string> {
        try {
            const base64Image = buffer.toString('base64')

            const requestBody = {
                requests: [
                    {
                        image: {
                            content: base64Image
                        },
                        features: [
                            {
                                type: 'TEXT_DETECTION',
                                maxResults: 1
                            }
                        ]
                    }
                ]
            }

            const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            })

            if (!response.ok) {
                const errorText = await response.text()
                throw new Error(`Google Vision API error: ${response.status} - ${errorText}`)
            }

            const data = await response.json()

            if (data.responses && data.responses[0] && data.responses[0].textAnnotations) {
                const textAnnotations = data.responses[0].textAnnotations
                if (textAnnotations.length > 0) {
                    return textAnnotations[0].description || ''
                }
            }

            return ''
        } catch (error) {
            throw new Error(`Google Vision OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }
}

