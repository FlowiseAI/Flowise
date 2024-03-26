import path from 'path'
import * as fs from 'fs'

const getAllTemplates = async () => {
    try {
        let marketplaceDir = path.join(__dirname, '..', '..', '..', 'marketplaces', 'chatflows')
        let jsonsInDir = fs.readdirSync(marketplaceDir).filter((file) => path.extname(file) === '.json')
        let templates: any[] = []
        jsonsInDir.forEach((file, index) => {
            const filePath = path.join(__dirname, '..', '..', '..', 'marketplaces', 'chatflows', file)
            const fileData = fs.readFileSync(filePath)
            const fileDataObj = JSON.parse(fileData.toString())
            const template = {
                id: index,
                templateName: file.split('.json')[0],
                flowData: fileData.toString(),
                badge: fileDataObj?.badge,
                framework: fileDataObj?.framework,
                categories: fileDataObj?.categories,
                type: 'Chatflow',
                description: fileDataObj?.description || ''
            }
            templates.push(template)
        })

        marketplaceDir = path.join(__dirname, '..', '..', '..', 'marketplaces', 'tools')
        jsonsInDir = fs.readdirSync(marketplaceDir).filter((file) => path.extname(file) === '.json')
        jsonsInDir.forEach((file, index) => {
            const filePath = path.join(__dirname, '..', '..', '..', 'marketplaces', 'tools', file)
            const fileData = fs.readFileSync(filePath)
            const fileDataObj = JSON.parse(fileData.toString())
            const template = {
                ...fileDataObj,
                id: index,
                type: 'Tool',
                framework: fileDataObj?.framework,
                badge: fileDataObj?.badge,
                categories: '',
                templateName: file.split('.json')[0]
            }
            templates.push(template)
        })
        const FlowiseDocsQnA = templates.find((tmp) => tmp.name === 'Flowise Docs QnA')
        const FlowiseDocsQnAIndex = templates.findIndex((tmp) => tmp.name === 'Flowise Docs QnA')
        if (FlowiseDocsQnA && FlowiseDocsQnAIndex > 0) {
            templates.splice(FlowiseDocsQnAIndex, 1)
            templates.unshift(FlowiseDocsQnA)
        }
        const dbResponse = templates.sort((a, b) => a.templateName.localeCompare(b.templateName))
        return dbResponse
    } catch (error) {
        throw new Error(`Error: marketplacesService.getAllTemplates - ${error}`)
    }
}

export default {
    getAllTemplates
}
