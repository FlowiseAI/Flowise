import type { ReactElement } from 'react'

import { ThemeProvider } from '@mui/material/styles'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'

import { createAgentflowTheme } from '@/core/theme/createAgentflowTheme'
import type { ComponentCredentialSchema } from '@/core/types'

import { CreateCredentialDialog } from './CreateCredentialDialog'

const theme = createAgentflowTheme(false)
function renderWithTheme(ui: ReactElement) {
    return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>)
}

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@tabler/icons-react', () => ({
    IconAlertTriangle: () => <span data-testid='icon-alert-triangle' />,
    IconArrowsMaximize: () => <span data-testid='icon-expand' />,
    IconEye: () => <span data-testid='icon-eye' />,
    IconEyeOff: () => <span data-testid='icon-eye-off' />,
    IconSearch: () => <span data-testid='icon-search' />,
    IconX: () => <span data-testid='icon-x' />
}))

jest.mock('html-react-parser', () => ({
    __esModule: true,
    default: (html: string) => <span data-testid='parsed-html'>{html}</span>
}))

jest.mock('@/atoms/JsonInput', () => ({
    JsonInput: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
        <textarea data-testid='json-input' value={value} onChange={(e) => onChange(e.target.value)} />
    )
}))

jest.mock('@/atoms/SwitchInput', () => ({
    SwitchInput: ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
        <input data-testid='switch-input' type='checkbox' checked={!!value} onChange={(e) => onChange(e.target.checked)} />
    )
}))

jest.mock('@/atoms/TooltipWithParser', () => ({
    TooltipWithParser: ({ title }: { title: string }) => <span data-testid='tooltip-with-parser'>{title}</span>
}))

jest.mock('@/atoms/Dropdown', () => ({
    Dropdown: ({
        value,
        onSelect,
        options
    }: {
        value: string
        onSelect: (v: string) => void
        options: Array<{ name: string; label: string }>
    }) => (
        <select data-testid='dropdown' value={value} onChange={(e) => onSelect(e.target.value)}>
            {options.map((o) => (
                <option key={o.name} value={o.name}>
                    {o.label}
                </option>
            ))}
        </select>
    )
}))

const mockGetComponentCredentialSchema = jest.fn()
const mockCreateCredential = jest.fn()
const mockGetCredentialById = jest.fn()
const mockUpdateCredential = jest.fn()
const mockRevealCredential = jest.fn()

const mockApiContext = {
    credentialsApi: {
        getComponentCredentialSchema: mockGetComponentCredentialSchema,
        createCredential: mockCreateCredential,
        getCredentialById: mockGetCredentialById,
        updateCredential: mockUpdateCredential,
        revealCredential: mockRevealCredential
    },
    apiBaseUrl: 'http://localhost:3000'
}

jest.mock('@/infrastructure/store/ApiContext', () => ({
    useApiContext: () => mockApiContext
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const openAISchema: ComponentCredentialSchema = {
    label: 'OpenAI API',
    name: 'openAIApi',
    description: 'Your <a href="https://openai.com">OpenAI</a> API key.',
    inputs: [{ label: 'OpenAI Api Key', name: 'openAIApiKey', type: 'password' }]
}

const awsSchema: ComponentCredentialSchema = {
    label: 'AWS security credentials',
    name: 'awsApi',
    description: 'Your AWS security credentials.',
    inputs: [
        { label: 'AWS Access Key', name: 'awsKey', type: 'string', optional: true, description: 'The access key' },
        { label: 'AWS Secret Key', name: 'awsSecret', type: 'password', optional: true },
        { label: 'Role ARN', name: 'roleArn', type: 'string', optional: true, placeholder: 'arn:aws:iam::role/name' }
    ]
}

const schemaWithAllTypes: ComponentCredentialSchema = {
    label: 'Full Schema',
    name: 'fullSchema',
    inputs: [
        { label: 'Text Field', name: 'textField', type: 'string' },
        { label: 'Secret', name: 'secret', type: 'password' },
        { label: 'Count', name: 'count', type: 'number' },
        { label: 'Enabled', name: 'enabled', type: 'boolean' },
        {
            label: 'Format',
            name: 'format',
            type: 'options',
            options: [
                { label: 'JSON', name: 'json' },
                { label: 'XML', name: 'xml' }
            ]
        },
        { label: 'Config', name: 'config', type: 'json' },
        { label: 'Hidden', name: 'hiddenField', type: 'string', hidden: true },
        { label: 'Multiline', name: 'multiline', type: 'string', rows: 4, placeholder: 'Enter text...' }
    ]
}

const schemaWithWarning: ComponentCredentialSchema = {
    label: 'Warning Schema',
    name: 'warningSchema',
    inputs: [{ label: 'Dangerous Field', name: 'danger', type: 'string', warning: 'This may break things!' }]
}

const schemaWithUrl: ComponentCredentialSchema = {
    label: 'Redis Connection',
    name: 'redisApi',
    inputs: [{ label: 'Redis URL', name: 'redisUrl', type: 'url', placeholder: 'redis://localhost:6379' }]
}

const schemaWithMultilinePassword: ComponentCredentialSchema = {
    label: 'Google Vertex',
    name: 'googleVertexAuth',
    inputs: [
        {
            label: 'Google Application Credential',
            name: 'googleApplicationCredential',
            type: 'password',
            rows: 4,
            placeholder: 'Paste JSON here'
        }
    ]
}

const schemaWithNumber: ComponentCredentialSchema = {
    label: 'Port Config',
    name: 'portConfig',
    inputs: [{ label: 'Port', name: 'port', type: 'number', optional: true }]
}

const REDACTED = '_FLOWISE_BLANK_07167752-1a71-43b1-bf8f-4f32252165db'
const MASKED_URL = 'redis://user:••••••@localhost:6379'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const defaultProps = {
    open: true,
    credentialNames: ['openAIApi'],
    onClose: jest.fn(),
    onCreated: jest.fn()
}

beforeEach(() => {
    jest.clearAllMocks()
    mockGetComponentCredentialSchema.mockResolvedValue(openAISchema)
    mockCreateCredential.mockResolvedValue({ id: 'new-cred-123' })
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CreateCredentialDialog', () => {
    it('shows loading spinner while fetching schema', async () => {
        let resolveSchema!: (v: ComponentCredentialSchema) => void
        mockGetComponentCredentialSchema.mockReturnValue(
            new Promise<ComponentCredentialSchema>((r) => {
                resolveSchema = r
            })
        )
        renderWithTheme(<CreateCredentialDialog {...defaultProps} />)

        expect(screen.getByRole('progressbar')).toBeInTheDocument()

        // Resolve to avoid hanging cleanup
        await act(async () => {
            resolveSchema(openAISchema)
        })
    })

    it('fetches schema and renders form for single credentialName', async () => {
        renderWithTheme(<CreateCredentialDialog {...defaultProps} />)

        await waitFor(() => {
            expect(mockGetComponentCredentialSchema).toHaveBeenCalledWith('openAIApi')
            expect(screen.getByText('OpenAI API')).toBeInTheDocument()
            expect(screen.getByText('Credential Name')).toBeInTheDocument()
            expect(screen.getByText('OpenAI Api Key')).toBeInTheDocument()
        })
    })

    it('renders credential icon in dialog title', async () => {
        renderWithTheme(<CreateCredentialDialog {...defaultProps} />)

        await waitFor(() => {
            const img = screen.getByAltText('openAIApi')
            expect(img).toBeInTheDocument()
            expect(img).toHaveAttribute('src', 'http://localhost:3000/api/v1/components-credentials-icon/openAIApi')
        })
    })

    it('renders description banner with parsed HTML', async () => {
        renderWithTheme(<CreateCredentialDialog {...defaultProps} />)

        await waitFor(() => {
            expect(screen.getByTestId('parsed-html')).toBeInTheDocument()
        })
    })

    it('shows error alert when schema fetch fails', async () => {
        mockGetComponentCredentialSchema.mockRejectedValue(new Error('Network error'))
        renderWithTheme(<CreateCredentialDialog {...defaultProps} />)

        await waitFor(() => {
            expect(screen.getByText('Network error')).toBeInTheDocument()
        })
    })

    it('credential name starts empty with label as placeholder', async () => {
        renderWithTheme(<CreateCredentialDialog {...defaultProps} />)

        await waitFor(() => {
            const nameInput = screen.getByPlaceholderText('OpenAI API')
            expect(nameInput).toHaveValue('')
        })
    })

    it('Add button is disabled when credential name is empty', async () => {
        renderWithTheme(<CreateCredentialDialog {...defaultProps} />)

        await waitFor(() => {
            expect(screen.getByText('Add')).toBeDisabled()
        })
    })

    it('Add button is disabled when required fields are empty', async () => {
        renderWithTheme(<CreateCredentialDialog {...defaultProps} />)

        await waitFor(() => screen.getByPlaceholderText('OpenAI API'))

        // Fill credential name but leave required field empty
        fireEvent.change(screen.getByPlaceholderText('OpenAI API'), { target: { value: 'My Key' } })

        expect(screen.getByText('Add')).toBeDisabled()
    })

    it('Add button is enabled when credential name and required fields are filled', async () => {
        renderWithTheme(<CreateCredentialDialog {...defaultProps} />)

        await waitFor(() => screen.getByPlaceholderText('OpenAI API'))

        fireEvent.change(screen.getByPlaceholderText('OpenAI API'), { target: { value: 'My Key' } })
        fireEvent.change(screen.getByDisplayValue(''), { target: { value: 'sk-test-key' } })

        expect(screen.getByText('Add')).not.toBeDisabled()
    })

    it('submits credential and calls onCreated with new ID', async () => {
        renderWithTheme(<CreateCredentialDialog {...defaultProps} />)

        await waitFor(() => screen.getByPlaceholderText('OpenAI API'))

        fireEvent.change(screen.getByPlaceholderText('OpenAI API'), { target: { value: 'My OpenAI Key' } })
        fireEvent.change(screen.getByDisplayValue(''), { target: { value: 'sk-test-key' } })

        await act(async () => {
            fireEvent.click(screen.getByText('Add'))
        })

        expect(mockCreateCredential).toHaveBeenCalledWith({
            name: 'My OpenAI Key',
            credentialName: 'openAIApi',
            plainDataObj: { openAIApiKey: 'sk-test-key' }
        })
        expect(defaultProps.onCreated).toHaveBeenCalledWith('new-cred-123')
    })

    it('shows error when credential creation fails', async () => {
        mockCreateCredential.mockRejectedValue(new Error('Server error'))
        renderWithTheme(<CreateCredentialDialog {...defaultProps} />)

        await waitFor(() => screen.getByPlaceholderText('OpenAI API'))

        fireEvent.change(screen.getByPlaceholderText('OpenAI API'), { target: { value: 'My Key' } })
        fireEvent.change(screen.getByDisplayValue(''), { target: { value: 'sk-test-key' } })

        await act(async () => {
            fireEvent.click(screen.getByText('Add'))
        })

        await waitFor(() => {
            expect(screen.getByText('Server error')).toBeInTheDocument()
        })
    })

    it('calls onClose when Cancel is clicked', async () => {
        renderWithTheme(<CreateCredentialDialog {...defaultProps} />)

        await waitFor(() => screen.getByText('Cancel'))

        fireEvent.click(screen.getByText('Cancel'))
        expect(defaultProps.onClose).toHaveBeenCalled()
    })

    it('does not render when open is false', () => {
        renderWithTheme(<CreateCredentialDialog {...defaultProps} open={false} />)

        expect(screen.queryByText('Credential Name')).not.toBeInTheDocument()
    })
})

describe('CreateCredentialDialog – multiple credential types', () => {
    it('shows type selection when multiple credentialNames provided', async () => {
        mockGetComponentCredentialSchema.mockImplementation((name: string) => {
            if (name === 'openAIApi') return Promise.resolve(openAISchema)
            return Promise.resolve(awsSchema)
        })

        renderWithTheme(<CreateCredentialDialog {...defaultProps} credentialNames={['openAIApi', 'awsApi']} />)

        await waitFor(() => {
            expect(screen.getByText('Add New Credential')).toBeInTheDocument()
            expect(screen.getByText('OpenAI API')).toBeInTheDocument()
            expect(screen.getByText('AWS security credentials')).toBeInTheDocument()
        })
    })

    it('selecting a type shows the form for that credential', async () => {
        mockGetComponentCredentialSchema.mockImplementation((name: string) => {
            if (name === 'openAIApi') return Promise.resolve(openAISchema)
            return Promise.resolve(awsSchema)
        })

        renderWithTheme(<CreateCredentialDialog {...defaultProps} credentialNames={['openAIApi', 'awsApi']} />)

        await waitFor(() => screen.getByText('AWS security credentials'))

        fireEvent.click(screen.getByText('AWS security credentials'))

        expect(screen.getByText('AWS Access Key')).toBeInTheDocument()
        expect(screen.getByText('AWS Secret Key')).toBeInTheDocument()
        expect(screen.getByText('Role ARN')).toBeInTheDocument()
    })
})

describe('CredentialField – field types', () => {
    it('renders all visible field types and hides hidden fields', async () => {
        mockGetComponentCredentialSchema.mockResolvedValue(schemaWithAllTypes)
        renderWithTheme(<CreateCredentialDialog {...defaultProps} credentialNames={['fullSchema']} />)

        await waitFor(() => {
            expect(screen.getByText('Text Field')).toBeInTheDocument()
            expect(screen.getByText('Secret')).toBeInTheDocument()
            expect(screen.getByText('Count')).toBeInTheDocument()
            expect(screen.getByText('Enabled')).toBeInTheDocument()
            expect(screen.getByText('Format')).toBeInTheDocument()
            expect(screen.getByText('Config')).toBeInTheDocument()
            expect(screen.getByText('Multiline')).toBeInTheDocument()
            expect(screen.queryByText('Hidden')).not.toBeInTheDocument()
        })
    })

    it('renders boolean field with SwitchInput', async () => {
        mockGetComponentCredentialSchema.mockResolvedValue(schemaWithAllTypes)
        renderWithTheme(<CreateCredentialDialog {...defaultProps} credentialNames={['fullSchema']} />)

        await waitFor(() => {
            expect(screen.getByTestId('switch-input')).toBeInTheDocument()
        })
    })

    it('renders json field with JsonInput', async () => {
        mockGetComponentCredentialSchema.mockResolvedValue(schemaWithAllTypes)
        renderWithTheme(<CreateCredentialDialog {...defaultProps} credentialNames={['fullSchema']} />)

        await waitFor(() => {
            expect(screen.getByTestId('json-input')).toBeInTheDocument()
        })
    })

    it('renders options field with Dropdown', async () => {
        mockGetComponentCredentialSchema.mockResolvedValue(schemaWithAllTypes)
        renderWithTheme(<CreateCredentialDialog {...defaultProps} credentialNames={['fullSchema']} />)

        await waitFor(() => {
            expect(screen.getByTestId('dropdown')).toBeInTheDocument()
        })
    })

    it('renders multiline string field with expand button', async () => {
        mockGetComponentCredentialSchema.mockResolvedValue(schemaWithAllTypes)
        renderWithTheme(<CreateCredentialDialog {...defaultProps} credentialNames={['fullSchema']} />)

        await waitFor(() => {
            expect(screen.getByTitle('Expand')).toBeInTheDocument()
        })
    })

    it('renders placeholder for string fields', async () => {
        mockGetComponentCredentialSchema.mockResolvedValue(awsSchema)
        renderWithTheme(<CreateCredentialDialog {...defaultProps} credentialNames={['awsApi']} />)

        await waitFor(() => {
            expect(screen.getByPlaceholderText('arn:aws:iam::role/name')).toBeInTheDocument()
        })
    })

    it('renders tooltip for fields with description', async () => {
        mockGetComponentCredentialSchema.mockResolvedValue(awsSchema)
        renderWithTheme(<CreateCredentialDialog {...defaultProps} credentialNames={['awsApi']} />)

        await waitFor(() => {
            expect(screen.getByTestId('tooltip-with-parser')).toBeInTheDocument()
        })
    })

    it('renders required indicator for non-optional fields', async () => {
        mockGetComponentCredentialSchema.mockResolvedValue(openAISchema)
        renderWithTheme(<CreateCredentialDialog {...defaultProps} />)

        await waitFor(() => {
            // OpenAI Api Key has optional undefined (required)
            const stars = screen.getAllByText('*')
            expect(stars.length).toBeGreaterThanOrEqual(1)
        })
    })

    it('renders warning banner when field has warning', async () => {
        mockGetComponentCredentialSchema.mockResolvedValue(schemaWithWarning)
        renderWithTheme(<CreateCredentialDialog {...defaultProps} credentialNames={['warningSchema']} />)

        await waitFor(() => {
            expect(screen.getByText('This may break things!')).toBeInTheDocument()
            expect(screen.getByTestId('icon-alert-triangle')).toBeInTheDocument()
        })
    })
})

describe('CreateCredentialDialog – edit mode', () => {
    const editProps = { ...defaultProps, editCredentialId: 'cred-123' }

    beforeEach(() => {
        mockGetCredentialById.mockResolvedValue({
            id: 'cred-123',
            name: 'Existing Key',
            credentialName: 'openAIApi',
            plainDataObj: { openAIApiKey: REDACTED }
        })
        mockUpdateCredential.mockResolvedValue({ id: 'cred-123' })
    })

    it('loads existing credential name and form values', async () => {
        renderWithTheme(<CreateCredentialDialog {...editProps} />)

        await waitFor(() => {
            expect(mockGetCredentialById).toHaveBeenCalledWith('cred-123')
            expect(screen.getByPlaceholderText('OpenAI API')).toHaveValue('Existing Key')
        })
    })

    it('shows Save button instead of Add in edit mode', async () => {
        renderWithTheme(<CreateCredentialDialog {...editProps} />)

        await waitFor(() => {
            expect(screen.getByText('Save')).toBeInTheDocument()
            expect(screen.queryByText('Add')).not.toBeInTheDocument()
        })
    })

    it('skips redacted values and calls updateCredential on save', async () => {
        renderWithTheme(<CreateCredentialDialog {...editProps} />)

        await waitFor(() => screen.getByText('Save'))

        await act(async () => {
            fireEvent.click(screen.getByText('Save'))
        })

        expect(mockUpdateCredential).toHaveBeenCalledWith('cred-123', {
            name: 'Existing Key',
            credentialName: 'openAIApi',
            plainDataObj: {}
        })
        expect(defaultProps.onCreated).toHaveBeenCalledWith('cred-123')
    })

    it('skips masked URL values on save', async () => {
        mockGetComponentCredentialSchema.mockResolvedValue(schemaWithUrl)
        mockGetCredentialById.mockResolvedValue({
            id: 'cred-123',
            name: 'My Redis',
            credentialName: 'redisApi',
            plainDataObj: { redisUrl: MASKED_URL }
        })
        mockUpdateCredential.mockResolvedValue({ id: 'cred-123' })

        renderWithTheme(<CreateCredentialDialog {...defaultProps} credentialNames={['redisApi']} editCredentialId='cred-123' />)

        await waitFor(() => screen.getByText('Save'))

        await act(async () => {
            fireEvent.click(screen.getByText('Save'))
        })

        expect(mockUpdateCredential).toHaveBeenCalledWith('cred-123', {
            name: 'My Redis',
            credentialName: 'redisApi',
            plainDataObj: {}
        })
    })

    it('shows error message when update fails', async () => {
        mockUpdateCredential.mockRejectedValue(new Error('Update failed'))
        renderWithTheme(<CreateCredentialDialog {...editProps} />)

        await waitFor(() => screen.getByText('Save'))

        await act(async () => {
            fireEvent.click(screen.getByText('Save'))
        })

        await waitFor(() => {
            expect(screen.getByText('Update failed')).toBeInTheDocument()
        })
    })

    it('shows generic update error for non-Error rejection', async () => {
        mockUpdateCredential.mockRejectedValue('oops')
        renderWithTheme(<CreateCredentialDialog {...editProps} />)

        await waitFor(() => screen.getByText('Save'))

        await act(async () => {
            fireEvent.click(screen.getByText('Save'))
        })

        await waitFor(() => {
            expect(screen.getByText('Failed to update credential')).toBeInTheDocument()
        })
    })
})

describe('CreateCredentialDialog – create mode error fallback', () => {
    it('shows generic create error for non-Error rejection', async () => {
        mockCreateCredential.mockRejectedValue('network down')
        renderWithTheme(<CreateCredentialDialog {...defaultProps} />)

        await waitFor(() => screen.getByPlaceholderText('OpenAI API'))

        fireEvent.change(screen.getByPlaceholderText('OpenAI API'), { target: { value: 'My Key' } })
        fireEvent.change(screen.getByDisplayValue(''), { target: { value: 'sk-test' } })

        await act(async () => {
            fireEvent.click(screen.getByText('Add'))
        })

        await waitFor(() => {
            expect(screen.getByText('Failed to create credential')).toBeInTheDocument()
        })
    })
})

describe('CredentialField – URL type', () => {
    beforeEach(() => {
        mockRevealCredential.mockResolvedValue({
            plainDataObj: { redisUrl: 'redis://user:secret@localhost:6379' }
        })
    })

    it('URL field in add mode renders plain text input without eye icon', async () => {
        mockGetComponentCredentialSchema.mockResolvedValue(schemaWithUrl)
        renderWithTheme(<CreateCredentialDialog {...defaultProps} credentialNames={['redisApi']} />)

        await waitFor(() => {
            expect(screen.getByText('Redis URL')).toBeInTheDocument()
            expect(screen.queryByLabelText('Show')).not.toBeInTheDocument()
        })
    })

    it('URL field in edit mode renders with eye toggle and hint text', async () => {
        mockGetComponentCredentialSchema.mockResolvedValue(schemaWithUrl)
        mockGetCredentialById.mockResolvedValue({
            id: 'cred-1',
            name: 'My Redis',
            credentialName: 'redisApi',
            plainDataObj: { redisUrl: MASKED_URL }
        })

        renderWithTheme(<CreateCredentialDialog {...defaultProps} credentialNames={['redisApi']} editCredentialId='cred-1' />)

        await waitFor(() => {
            expect(screen.getByLabelText('Show')).toBeInTheDocument()
            expect(screen.getByText('Click the eye icon to reveal the value before editing.')).toBeInTheDocument()
        })
    })

    it('clicking eye icon reveals the URL value and switches to Hide', async () => {
        mockGetComponentCredentialSchema.mockResolvedValue(schemaWithUrl)
        mockGetCredentialById.mockResolvedValue({
            id: 'cred-1',
            name: 'My Redis',
            credentialName: 'redisApi',
            plainDataObj: { redisUrl: MASKED_URL }
        })

        renderWithTheme(<CreateCredentialDialog {...defaultProps} credentialNames={['redisApi']} editCredentialId='cred-1' />)

        await waitFor(() => screen.getByLabelText('Show'))

        await act(async () => {
            fireEvent.click(screen.getByLabelText('Show'))
        })

        expect(mockRevealCredential).toHaveBeenCalledWith('cred-1')

        await waitFor(() => {
            expect(screen.getByLabelText('Hide')).toBeInTheDocument()
        })
    })

    it('clicking Hide restores the masked URL', async () => {
        mockGetComponentCredentialSchema.mockResolvedValue(schemaWithUrl)
        mockGetCredentialById.mockResolvedValue({
            id: 'cred-1',
            name: 'My Redis',
            credentialName: 'redisApi',
            plainDataObj: { redisUrl: MASKED_URL }
        })

        renderWithTheme(<CreateCredentialDialog {...defaultProps} credentialNames={['redisApi']} editCredentialId='cred-1' />)

        await waitFor(() => screen.getByLabelText('Show'))

        await act(async () => {
            fireEvent.click(screen.getByLabelText('Show'))
        })

        await waitFor(() => screen.getByLabelText('Hide'))

        await act(async () => {
            fireEvent.click(screen.getByLabelText('Hide'))
        })

        await waitFor(() => {
            expect(screen.getByLabelText('Show')).toBeInTheDocument()
        })
    })

    it('second reveal reuses cached data without calling revealCredential again', async () => {
        mockGetComponentCredentialSchema.mockResolvedValue(schemaWithUrl)
        mockGetCredentialById.mockResolvedValue({
            id: 'cred-1',
            name: 'My Redis',
            credentialName: 'redisApi',
            plainDataObj: { redisUrl: MASKED_URL }
        })

        renderWithTheme(<CreateCredentialDialog {...defaultProps} credentialNames={['redisApi']} editCredentialId='cred-1' />)

        await waitFor(() => screen.getByLabelText('Show'))

        await act(async () => {
            fireEvent.click(screen.getByLabelText('Show'))
        })
        await waitFor(() => screen.getByLabelText('Hide'))
        await act(async () => {
            fireEvent.click(screen.getByLabelText('Hide'))
        })
        await waitFor(() => screen.getByLabelText('Show'))
        await act(async () => {
            fireEvent.click(screen.getByLabelText('Show'))
        })

        expect(mockRevealCredential).toHaveBeenCalledTimes(1)
    })
})

describe('CredentialField – multiline password', () => {
    beforeEach(() => {
        mockGetComponentCredentialSchema.mockResolvedValue(schemaWithMultilinePassword)
        mockGetCredentialById.mockResolvedValue({
            id: 'cred-1',
            name: 'My Vertex',
            credentialName: 'googleVertexAuth',
            plainDataObj: { googleApplicationCredential: REDACTED }
        })
        mockUpdateCredential.mockResolvedValue({ id: 'cred-1' })
    })

    it('shows placeholder dots when value is the redacted sentinel', async () => {
        renderWithTheme(<CreateCredentialDialog {...defaultProps} credentialNames={['googleVertexAuth']} editCredentialId='cred-1' />)

        await waitFor(() => {
            expect(screen.getByPlaceholderText('Paste JSON here')).toHaveValue('••••••••••••••')
        })
    })

    it('clears to empty on focus when showing dots', async () => {
        renderWithTheme(<CreateCredentialDialog {...defaultProps} credentialNames={['googleVertexAuth']} editCredentialId='cred-1' />)

        await waitFor(() => screen.getByPlaceholderText('Paste JSON here'))

        await act(async () => {
            fireEvent.focus(screen.getByPlaceholderText('Paste JSON here'))
        })

        expect(screen.getByPlaceholderText('Paste JSON here')).toHaveValue('')
    })

    it('restores dots on blur when field is left empty', async () => {
        renderWithTheme(<CreateCredentialDialog {...defaultProps} credentialNames={['googleVertexAuth']} editCredentialId='cred-1' />)

        await waitFor(() => screen.getByPlaceholderText('Paste JSON here'))

        await act(async () => {
            fireEvent.focus(screen.getByPlaceholderText('Paste JSON here'))
        })

        await waitFor(() => {
            expect(screen.getByPlaceholderText('Paste JSON here')).toHaveValue('')
        })

        await act(async () => {
            fireEvent.blur(screen.getByPlaceholderText('Paste JSON here'))
        })

        await waitFor(() => {
            expect(screen.getByPlaceholderText('Paste JSON here')).toHaveValue('••••••••••••••')
        })
    })

    it('does not restore dots on blur when field has content', async () => {
        renderWithTheme(<CreateCredentialDialog {...defaultProps} credentialNames={['googleVertexAuth']} editCredentialId='cred-1' />)

        await waitFor(() => screen.getByPlaceholderText('Paste JSON here'))

        const textarea = screen.getByPlaceholderText('Paste JSON here')

        await act(async () => {
            fireEvent.focus(textarea)
        })
        await act(async () => {
            fireEvent.change(textarea, { target: { value: '{"key":"value"}' } })
        })
        await act(async () => {
            fireEvent.blur(textarea)
        })

        expect(screen.getByPlaceholderText('Paste JSON here')).toHaveValue('{"key":"value"}')
    })
})

describe('CredentialField – number coercion', () => {
    it('converts string value to number when submitting a number field', async () => {
        mockGetComponentCredentialSchema.mockResolvedValue(schemaWithNumber)
        renderWithTheme(<CreateCredentialDialog {...defaultProps} credentialNames={['portConfig']} />)

        await waitFor(() => screen.getByPlaceholderText('Port Config'))

        fireEvent.change(screen.getByPlaceholderText('Port Config'), { target: { value: 'My Cred' } })
        fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '6379' } })

        await act(async () => {
            fireEvent.click(screen.getByText('Add'))
        })

        expect(mockCreateCredential).toHaveBeenCalledWith({
            name: 'My Cred',
            credentialName: 'portConfig',
            plainDataObj: { port: 6379 }
        })
    })
})
