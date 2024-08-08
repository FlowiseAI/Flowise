#!/usr/bin/env node
import { promises as fs } from 'fs'
import YAML from 'yaml'
import { OpenAPIV3 } from 'openapi-types'
import swagger2_0ToMarkdown from './swagger2_0ToMarkdown'

type References = { [key: string]: unknown }

interface PathMethod {
    path: string
    method: string
    operation: OpenAPIV3.OperationObject
}
interface ApiDocument {
    document: OpenAPIV3.Document
    pathMethods: PathMethod[]
    references: References
}
const markdownText = (text: string) => text.replace(/\n/g, '  \n')

const createApiDocument = (document: OpenAPIV3.Document): ApiDocument => {
    const pathMethods: PathMethod[] = []
    for (const [path, pathItem] of Object.entries<OpenAPIV3.PathItemObject | undefined>(document.paths)) {
        if (!pathItem) continue
        for (const [method, operation] of Object.entries(pathItem)) {
            if (method === 'parameters') continue
            pathMethods.push({
                path,
                method: method.toUpperCase(),
                operation: operation as OpenAPIV3.OperationObject
            })
        }
    }
    const references: References = {}
    if ('components' in document && document.components) {
        const { components } = document
        Object.entries(components).forEach(([key, value]) => {
            Object.entries(value).forEach(([key2, value]) => {
                references[`#/components/${key}/${key2}`] = value
            })
        })
    }
    return { document, pathMethods, references }
}

const convertPath = (path: string) =>
    path
        .replace(/[!@#$%^&*()+|~=`[\]{};':",./<>?]/g, '')
        .replace(/ /g, '-')
        .toLowerCase()

const outputPathTable = ({ document, pathMethods }: ApiDocument) => {
    let output = `# ${document.info.title} - Version ${document.info.version}
${document.info.description ? '\n' + document.info.description + '\n' : ''}
## Path Table

| Method | Path | Description |
| --- | --- | --- |
`

    output += pathMethods.reduce(
        (a, { path, method, operation }) =>
            a + `| ${method.toUpperCase()} | [${path}](#${method.toLowerCase()}${convertPath(path)}) | ${operation.summary || ''} |\n`,
        ''
    )

    return output + '\n'
}

const outputReferenceTable = (apiDocument: ApiDocument) => {
    const { references } = apiDocument
    let output = `## Reference Table

| Name | Path | Description |
| --- | --- | --- |
`

    Object.entries(references).forEach(([key, value]) => {
        const v = getApiObject<{
            description?: string
            name?: string
            title?: string
        }>(apiDocument, value)
        output += `| ${v.name || v.title || key ? key.substr(key.lastIndexOf('/') + 1) : ''} | ${
            key ? `[${key}](#${convertPath(key)})` : ''
        } | ${v.description || ''} |\n`
    })

    return output + '\n'
}
const getRefName = (refObjecgt: unknown | OpenAPIV3.ReferenceObject) => {
    if (typeof refObjecgt === 'object' && refObjecgt && '$ref' in refObjecgt) {
        return (refObjecgt as OpenAPIV3.ReferenceObject)['$ref']
    }
    return undefined
}

const getApiObject: {
    <T = unknown | OpenAPIV3.ReferenceObject>(apiDocument: ApiDocument, object: OpenAPIV3.ReferenceObject | unknown): T
    <T = unknown | OpenAPIV3.ReferenceObject>(apiDocument: ApiDocument, object: OpenAPIV3.ReferenceObject | unknown, refs?: Set<string>):
        | T
        | OpenAPIV3.ReferenceObject
} = <T = unknown | OpenAPIV3.ReferenceObject>(
    { references }: ApiDocument,
    object: OpenAPIV3.ReferenceObject | unknown,
    refs?: Set<string>
) => {
    const refName = getRefName(object)
    if (refName) {
        const ref = (object as OpenAPIV3.ReferenceObject)['$ref']
        if (refs) {
            if (refs.has(ref)) {
                return object
            }
            refs.add(ref)
        }
        return references[ref] as T
    }
    return object as T
}

const outputParamSchemas = (apiDocument: ApiDocument, parameters: OpenAPIV3.ParameterObject[]) => {
    let output = ''
    for (const param of parameters) {
        const p = getApiObject<OpenAPIV3.ParameterObject>(apiDocument, param)
        output += outputSchemas(apiDocument, p)
    }
    return output
}

const outputSchemas = (apiDocument: ApiDocument, schemas: unknown): string => {
    const apiObject = getApiObject<OpenAPIV3.SchemaObject | OpenAPIV3.RequestBodyObject | OpenAPIV3.ParameterObject>(apiDocument, schemas)

    if (!apiObject) return ''

    let output = ''

    if ('content' in apiObject) {
        Object.entries(apiObject.content!).forEach(([key, value]) => {
            output += `- ${key}\n\n`
            output += outputSchemas(apiDocument, value.schema)
        })
    } else {
        output += '```ts\n'

        if ('in' in apiObject) {
            output += outputRefComment(schemas, 0)
            output += outputObject(
                apiDocument,
                apiObject.name,
                apiObject.schema!,
                Array.isArray(apiObject.required) ? apiObject.required?.includes(apiObject.name) : apiObject.required
            )
        } else {
            if (apiObject.type === 'object') {
                output += outputObject(apiDocument, undefined, apiObject)
            } else if (apiObject.type === 'array') {
                output += outputObject(apiDocument, undefined, apiObject)
            } else {
                output += JSON.stringify(apiObject, undefined, '  ') + '\n'
            }
        }
        output += '```\n\n'
    }

    return output
}

const SP = (size: number) => ''.padEnd(size * 2)

const outputRefComment = (apiObject: OpenAPIV3.ReferenceObject | unknown, level: number) => {
    return ''
    // const refName = getRefName(apiObject);
    // return refName ? SP(level) + `// ${refName}\n` : '';
}

const outputComment = (refObject: OpenAPIV3.ReferenceObject | unknown | null, apiObject: OpenAPIV3.NonArraySchemaObject, level: number) => {
    if (refObject) {
        const refName = getRefName(apiObject)
        if (refName) return SP(level) + `// ${refName}\n`
    }
    return apiObject.description ? apiObject.description.split('\n').reduce((a, b) => a + SP(level) + `// ${b}\n`, '') : ''
}

const getTypeString = (
    apiDocument: ApiDocument,
    apiObject: OpenAPIV3.ReferenceObject | OpenAPIV3.ArraySchemaObject | OpenAPIV3.NonArraySchemaObject,
    refs: Set<string>,
    level: number
) => {
    const refName = getRefName(apiObject)
    if (refName) return refName
    else if ('type' in apiObject) {
        return apiObject.type === 'object' || apiObject.type === 'array'
            ? outputObject(apiDocument, undefined, apiObject, undefined, refs, level + 0.5).trimEnd()
            : apiObject.type
    }
    return ''
}

const outputObject = (
    apiDocument: ApiDocument,
    name: string | undefined,
    schemas: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject,
    required?: boolean,
    refs?: Set<string>,
    level?: number
) => {
    const nowLevel = level || 0
    const setRef = refs || new Set()
    const apiObject = getApiObject<OpenAPIV3.SchemaObject>(apiDocument, schemas, setRef)
    if (!apiObject) return ''

    let output = ''
    if ('$ref' in apiObject) {
        output += SP(nowLevel) + `${name}:${apiObject['$ref']}\n`
    } else if (apiObject.type === 'object') {
        output += outputComment(schemas, apiObject, nowLevel)
        output += name ? SP(nowLevel) + `${name}: {\n` : '{\n'
        apiObject.properties &&
            Object.entries(apiObject.properties).forEach(([key, value]) => {
                output += `${'#'.repeat(nowLevel + 1)} Property(${key})\n${outputObject(
                    apiDocument,
                    key,
                    value,
                    Array.isArray(apiObject.required) ? apiObject.required?.includes(key) : apiObject.required,
                    setRef,
                    nowLevel + 1
                )}`
            })
        output += SP(nowLevel) + '}\n'
    } else if (apiObject.type === 'array') {
        output += outputRefComment(schemas, nowLevel)
        output += outputObject(apiDocument, name, apiObject.items, undefined, setRef, nowLevel).trimEnd() + '[]\n'
    } else if (apiObject.type) {
        output += outputComment(schemas, apiObject, nowLevel)
        const type: string[] = Array.isArray(apiObject.type) ? apiObject.type : apiObject.type ? [apiObject.type] : []
        output +=
            (name ? SP(nowLevel) + `${name}${required === true ? '' : '?'}: ` : '') +
            `${type.reduce((a, b, index) => a + (index ? ' | ' : '') + b, '')}\n`
    } else if (apiObject.anyOf) {
        output += outputComment(schemas, apiObject, nowLevel)
        output += SP(nowLevel) + `${name}${required === true ? '' : '?'}: `
        apiObject.anyOf.forEach((obj, index) => {
            const typeName = getTypeString(apiDocument, obj, setRef, nowLevel)
            output += (index ? ' & ' : '') + `Partial(${typeName})`
        })
        output += '\n'
    } else if (apiObject.allOf) {
        output += outputComment(schemas, apiObject, nowLevel)
        output += SP(nowLevel) + `${name}${required === true ? '' : '?'}: `
        apiObject.allOf.forEach((obj, index) => {
            const typeName = getTypeString(apiDocument, obj, setRef, nowLevel)
            output += (index ? ' & ' : '') + `${typeName}`
        })
        output += '\n'
    } else if (apiObject.oneOf) {
        output += outputComment(schemas, apiObject, nowLevel)
        output += SP(nowLevel) + `${name}${required === true ? '' : '?'}: `
        apiObject.oneOf.forEach((obj, index) => {
            const typeName = getTypeString(apiDocument, obj, setRef, nowLevel)
            output += (index ? ' | ' : '') + `${typeName}`
        })
        output += '\n'
    }
    return output
}

const outputParameters = (apiDocument: ApiDocument, parameters: (OpenAPIV3.ParameterObject | OpenAPIV3.ReferenceObject)[]) => {
    const p: { [key: string]: OpenAPIV3.ParameterObject[] } = {}

    for (const param of parameters) {
        const apiParam = getApiObject<OpenAPIV3.ParameterObject>(apiDocument, param)
        if (!apiParam) continue
        p[apiParam.in] = p[apiParam.in] ? [...p[apiParam.in], apiParam] : [apiParam]
    }

    let output = ''

    if (p['query']) {
        output += '#### Parameters(Query)\n\n' + outputParamSchemas(apiDocument, p['query'])
    }

    if (p['body']) {
        output += '#### Parameters(Body)\n\n' + outputParamSchemas(apiDocument, p['body'])
    }

    if (p['header']) {
        output += '#### Headers\n\n' + outputParamSchemas(apiDocument, p['header'])
    }

    return output
}

const outputReferences = (apiDocument: ApiDocument) => {
    let output = '## References\n\n'
    Object.entries(apiDocument.references).forEach(([key, value]) => {
        output += `### ${key}\n\n`
        output += outputSchemas(apiDocument, value)
    })
    return output
}

const outputRequestBody = (apiDocument: ApiDocument, requestBody: OpenAPIV3.ReferenceObject | OpenAPIV3.RequestBodyObject | undefined) => {
    const body = getApiObject<OpenAPIV3.RequestBodyObject>(apiDocument, requestBody)
    let output = '#### RequestBody\n\n'
    output += outputSchemas(apiDocument, body)
    return output
}

const outputExamples = (apiDocument: ApiDocument, examples: OpenAPIV3.MediaTypeObject['examples']) => {
    const e = getApiObject<OpenAPIV3.MediaTypeObject['examples']>(apiDocument, examples)
    if (!e) return ''
    let output = '- Examples\n\n'
    Object.entries(e).forEach(([key, value]) => {
        const example = getApiObject<OpenAPIV3.ExampleObject>(apiDocument, value)
        output += `  - ${key}\n\n`
        output += '```json\n' + JSON.stringify(example, undefined, '  ') + '\n```\n\n'
    })
    return output
}

const outputResponses = (apiDocument: ApiDocument, responses: OpenAPIV3.ResponsesObject | undefined) => {
    if (!responses) return ''
    const responsesObject = getApiObject<OpenAPIV3.ResponsesObject>(apiDocument, responses)
    let output = '#### Responses\n\n'

    for (const [code, res] of Object.entries(responsesObject)) {
        const response = res as OpenAPIV3.ResponseObject
        output += `- ${code} ${response.description}\n\n`

        if (response.content)
            for (const [contentName, content] of Object.entries(response.content)) {
                output += `\`${contentName}\`\n\n`
                output += outputSchemas(apiDocument, content.schema)
                // output += outputExamples(apiDocument, content.examples);
            }
    }
    return output
}

const outputPathDatail = (apiDocument: ApiDocument) => {
    const { pathMethods } = apiDocument
    let output = `## Path Details\n\n`
    output += pathMethods.reduce(
        (a, { path, method, operation }) =>
            a +
            `***\n\n### [${method}]${path}\n\n` +
            (operation.summary ? `- Summary  \n${markdownText(operation.summary)}\n\n` : '') +
            (operation.description ? `- Description  \n${markdownText(operation.description)}\n\n` : '') +
            (operation.security
                ? `- Security  \n${markdownText(operation.security.reduce((a, b) => a + Object.keys(b)[0] + '\n', ''))}\n`
                : '') +
            (operation.parameters ? outputParameters(apiDocument, operation.parameters) : '') +
            ('requestBody' in operation ? outputRequestBody(apiDocument, operation.requestBody) : '') +
            ('responses' in operation ? outputResponses(apiDocument, operation.responses) : ''),
        ''
    )
    return output
}

export const openApiToMarkdown = async (openApiSpec: any) => {
    let openApi3Spec: any

    if (openApiSpec.swagger) {
        openApi3Spec = await swagger2_0ToMarkdown(openApiSpec)
    } else if (openApiSpec.openapi) {
        openApi3Spec = openApiSpec
    } else {
        throw new Error('Unrecognised input format')
    }

    const apiDocument = createApiDocument(openApi3Spec)

    let output = outputPathTable(apiDocument)
    output += outputReferenceTable(apiDocument)
    output += outputPathDatail(apiDocument)
    output += outputReferences(apiDocument)
    output = output.trimEnd()
    return output
}

export default openApiToMarkdown
