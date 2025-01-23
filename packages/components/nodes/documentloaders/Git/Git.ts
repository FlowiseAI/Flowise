import { omit } from 'lodash'
import { IDocument, INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { TextSplitter } from 'langchain/text_splitter'
import { exec } from 'child_process'
import fs from 'fs'
import path from 'path'
import { promisify } from 'util'
import { getCredentialData, getCredentialParam, ICommonObject } from '../../../src'

const execPromise = promisify(exec)

class Git_DocumentLoaders implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    credential: INodeParams
    inputs: INodeParams[]
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'Git'
        this.name = 'git'
        this.version = 1.0
        this.type = 'Document'
        this.icon = 'git.svg'
        this.category = 'Document Loaders'
        this.description = `Load data from any Git repository`
        this.baseClasses = [this.type]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            description: 'Provide an SSH key for private repositories',
            optional: true,
            credentialNames: ['githubApi']
        }
        this.inputs = [
            {
                label: 'Repo clone URL',
                name: 'repoCloneUrl',
                type: 'string',
                placeholder: 'git@github.com:username/repo.git'
            },
            {
                label: 'Branch',
                name: 'branch',
                type: 'string',
                default: 'main'
            },
            {
                label: 'Local Clone Path',
                name: 'localPath',
                type: 'string',
                placeholder: '/tmp/git-repo',
                default: '/tmp/git-repo'
            },
            {
                label: 'Text Splitter',
                name: 'textSplitter',
                type: 'TextSplitter',
                optional: true
            },
            {
                label: 'Additional Metadata',
                name: 'metadata',
                type: 'json',
                description: 'Additional metadata to be added to the extracted documents',
                optional: true
            },
            {
                label: 'Omit Metadata Keys',
                name: 'omitMetadataKeys',
                type: 'string',
                rows: 4,
                description:
                    'Keys to omit from metadata. Use * to omit all metadata keys except Additional Metadata.',
                placeholder: 'key1, key2'
            }
        ]
        this.outputs = [
            {
                label: 'Document',
                name: 'document',
                description: 'Array of document objects containing metadata and pageContent',
                baseClasses: [...this.baseClasses, 'json']
            },
            {
                label: 'Text',
                name: 'text',
                description: 'Concatenated string from pageContent of documents',
                baseClasses: ['string', 'json']
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        console.log('Node Data:', nodeData);

        const repoUrl = nodeData.inputs?.repoCloneUrl as string
        const branch = nodeData.inputs?.branch as string
        const localPath = `${nodeData.inputs?.localPath as string}/${repoUrl.split('/').pop()}`
        const sshKeyPath = `${nodeData.inputs?.localPath as string}/id_rsa`
        const textSplitter = nodeData.inputs?.textSplitter as TextSplitter
        const metadata = nodeData.inputs?.metadata
        const _omitMetadataKeys = nodeData.inputs?.omitMetadataKeys as string
        let gitAuth = '';
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const accessToken = getCredentialParam('accessToken', credentialData, nodeData)

        if (fs.existsSync(sshKeyPath)) {
            //remove previous key
            fs.rmSync(sshKeyPath, { force: true });
        }

        if (accessToken) {
            // Reformat the SSH key to proper PEM format
            const formattedKey = accessToken
                .replace("-----BEGIN OPENSSH PRIVATE KEY-----", '') // Remove the OpenSSH header
                .replace("-----END OPENSSH PRIVATE KEY-----", '') // Remove the OpenSSH footer
                .trim() // Remove leading/trailing whitespace or newlines
                .replace(/ +/g, '\n') // Ensure any spaces are replaced with newlines

            // Add PEM delimiters explicitly in case they're missing
            const completeKey = `-----BEGIN OPENSSH PRIVATE KEY-----\n${formattedKey}\n-----END OPENSSH PRIVATE KEY-----\n`;

            fs.writeFileSync(sshKeyPath, completeKey, { mode: 0o400 });
            gitAuth = `GIT_SSH_COMMAND="ssh -i ${sshKeyPath} -o IdentitiesOnly=yes -o StrictHostKeyChecking=no" `
        }

        console.log({ repoUrl, branch, localPath, textSplitter, metadata, _omitMetadataKeys, accessToken });

        let omitMetadataKeys: string[] = []
        if (_omitMetadataKeys) {
            omitMetadataKeys = _omitMetadataKeys.split(',').map((key) => key.trim())
        }

        if (!fs.existsSync(localPath)) {
            await execPromise(`${gitAuth}git clone --branch ${branch} ${repoUrl} ${localPath}`)
        } else {
            await execPromise(`${gitAuth}git -C ${localPath} pull origin ${branch}`)
        }

        const files = this.getFilesRecursive(localPath)
        const docs: IDocument[] = files.map((filePath) => {
            const content = fs.readFileSync(filePath, 'utf8')
            return {
                pageContent: content,
                metadata: {
                    filePath: path.relative(localPath, filePath),
                    ...(metadata ? JSON.parse(metadata) : {})
                }
            }
        })

        let processedDocs = docs
        console.log(' Docs:', docs.length);
        if (textSplitter) {
            processedDocs = await textSplitter.splitDocuments(docs)
        }

        processedDocs = processedDocs.map((doc) => ({
            ...doc,
            metadata: _omitMetadataKeys === '*'
                ? {}
                : omit(doc.metadata, omitMetadataKeys)
        }))
        console.log('Processed Docs:', processedDocs.length);

        return processedDocs
    }

    private getFilesRecursive(directory: string): string[] {
        const entries = fs.readdirSync(directory, { withFileTypes: true })
        const files = entries
            .filter((entry) => !entry.isDirectory())
            .map((file) => path.resolve(directory, file.name))
        const directories = entries.filter((entry) => entry.isDirectory())

        for (const dir of directories) {
            files.push(...this.getFilesRecursive(path.resolve(directory, dir.name)))
        }
        return files
    }
}

module.exports = { nodeClass: Git_DocumentLoaders }
