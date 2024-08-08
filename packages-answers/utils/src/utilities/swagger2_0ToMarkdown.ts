import { OpenAPIV2 } from 'openapi-types'
import swagger2openapi from 'swagger2openapi'

// @ts-ignore-next-line
const swagger2_0ToMarkdown = async (openApiSpec: OpenAPIV2.Document): string => {
    try {
        const sOptions: any = await swagger2openapi.convertObj(openApiSpec, {
            patch: true,
            anchors: false,
            warnOnly: true,
            resolve: true,
            resolveInternal: true,
            verbose: true,
            refSiblings: 'allOf'
        })

        const openApi3 = sOptions.openapi
        return openApi3
    } catch (err) {
        throw err
    }
}

export default swagger2_0ToMarkdown
