import { OpenAPIV3_1 } from 'openapi-types'

const openApiToMarkdown = (openApiSpec: OpenAPIV3_1.Document): string => {
    if (!openApiSpec?.paths) return ''
    const specHeading = `OpenAPI Specification for "${openApiSpec.info.title}" version "${openApiSpec.info.version}"`
    let output = 'test'

    for (const [pathName, path] of Object.entries(openApiSpec.paths)) {
        if (!path) continue

        const endPointHeading = `${specHeading} Endpoint "${pathName}"`
        console.log('========')
        // Add path-level parameters
        if (path.parameters) {
            output += `#### ${endPointHeading} Parameters \n\n`
            output += '| Name | In | Description | Required | Schema |\n'
            output += '| ---- | -- | ----------- | -------- | ------ |\n'

            for (const parameter of path.parameters as OpenAPIV3_1.ParameterObject[]) {
                output += `| ${parameter.name} | ${parameter.in} | ${parameter.description || ''} | ${parameter.required || false} | ${
                    parameter.schema ? JSON.stringify(parameter.schema) : ''
                } |\n`
            }

            output += '\n'
        }

        // Add operations
        for (const [methodName, operation] of Object.entries(path)) {
            if (!methodName || methodName === 'parameters' || !operation) continue

            let op: OpenAPIV3_1.OperationObject

            // Use a type assertion to tell the compiler that operation is an OperationObject
            // @ts-ignore-next-line
            if ('summary' in operation) {
                op = operation as OpenAPIV3_1.OperationObject
                const operationHeading = `${endPointHeading} Operation "${methodName.toUpperCase()}"`

                if (op.summary) {
                    output += `${op.summary}\n\n`
                }
                if (op.description) {
                    output += `${op.description}\n\n`
                }

                // Add operation-level parameters
                if (op.parameters) {
                    output += `#### ${operationHeading} Parameters \n\n`
                    output += '| Name | In | Description | Required | Schema |\n'
                    output += '| ---- | -- | ----------- | -------- | ------ |\n'

                    for (const parameter of op.parameters as OpenAPIV3_1.ParameterObject[]) {
                        output += `| ${parameter.name} | ${parameter.in} | ${parameter.description || ''} | ${
                            parameter.required || false
                        } | ${parameter.schema ? JSON.stringify(parameter.schema) : ''} |\n`
                    }

                    output += '\n'
                }

                // Add request body
                if (op.requestBody) {
                    output += `#### ${operationHeading} Request Body \n\n`
                    output += '| Media Type | Schema |\n'
                    output += '| ---------- | ------ |\n'

                    // @ts-ignore-next-line
                    for (const [mediaType, mediaTypeObject] of Object.entries(op.requestBody.content)) {
                        const schema = (mediaTypeObject as OpenAPIV3_1.MediaTypeObject).schema
                        output += `| ${mediaType} | ${schema ? JSON.stringify(schema) : ''} |\n`
                    }

                    output += '\n'
                }

                // Add responses
                if (op.responses) {
                    output += `#### ${operationHeading} Responses \n\n`
                    output += '| Status Code | Description | Media Type | Schema |\n'
                    output += '| ----------- | ----------- | ---------- | ------ |\n'

                    for (const [statusCode, response] of Object.entries(op.responses)) {
                        let res: OpenAPIV3_1.ResponseObject

                        // Use a type guard to check if the response is a ReferenceObject
                        if ('$ref' in response) {
                            const ref = response as OpenAPIV3_1.ReferenceObject
                            res = openApiSpec.components?.responses?.[ref.$ref.split('/').pop() || ''] as OpenAPIV3_1.ResponseObject
                        } else {
                            res = response as OpenAPIV3_1.ResponseObject
                        }

                        output += `| ${statusCode} | ${res.description || ''} |`

                        if (res.content) {
                            for (const [mediaType, mediaTypeObject] of Object.entries(res.content)) {
                                const schema = (mediaTypeObject as OpenAPIV3_1.MediaTypeObject).schema
                                output += ` ${mediaType} | ${schema ? JSON.stringify(schema) : ''} |`
                            }
                        } else {
                            output += ' | |'
                        }

                        output += '\n'
                    }

                    output += '\n'
                }
            }
        }
    }

    return output
}

export default openApiToMarkdown
