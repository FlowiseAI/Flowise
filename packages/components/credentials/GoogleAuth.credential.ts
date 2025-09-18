import { INodeParams, INodeCredential } from '../src/Interface'

class GoogleVertexAuth implements INodeCredential {
    label: string
    name: string
    version: number
    inputs: INodeParams[]

    constructor() {
        this.label = 'Google Vertex Auth'
        this.name = 'googleVertexAuth'
        this.version = 1.0
        this.inputs = [
            {
                label: 'Google Application Credential File Path',
                name: 'googleApplicationCredentialFilePath',
                description:
                    'Path to your google application credential json file. You can also use the credential JSON object (either one)',
                placeholder: 'your-path/application_default_credentials.json',
                type: 'string',
                optional: true
            },
            {
                label: 'Google Credential JSON Object',
                name: 'googleApplicationCredential',
                description: 'JSON object of your google application credential. You can also use the file path (either one)',
                placeholder: `{
    "type": ...,
    "project_id": ...,
    "private_key_id": ...,
    "private_key": ...,
    "client_email": ...,
    "client_id": ...,
    "auth_uri": ...,
    "token_uri": ...,
    "auth_provider_x509_cert_url": ...,
    "client_x509_cert_url": ...
}`,
                type: 'string',
                rows: 4,
                optional: true
            },
            {
                label: 'Project ID',
                name: 'projectID',
                description: 'Project ID of GCP. If not provided, it will be read from the credential file',
                type: 'string',
                optional: true,
                additionalParams: true
            }
        ]
    }
}

module.exports = { credClass: GoogleVertexAuth }
