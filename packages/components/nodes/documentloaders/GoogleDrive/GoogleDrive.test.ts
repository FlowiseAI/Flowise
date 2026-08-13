const { nodeClass } = require('./GoogleDrive')

interface DriveFile {
    id: string
    name: string
    mimeType: string
}

const FOLDER_MIME = 'application/vnd.google-apps.folder'

// Default fileTypes configured on the node (mirrors the node's default), notably
// WITHOUT the folder mimeType - this is what makes the secondary defect observable.
const DEFAULT_FILE_TYPES = [
    'application/vnd.google-apps.document',
    'application/vnd.google-apps.spreadsheet',
    'application/vnd.google-apps.presentation',
    'text/plain',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]

interface RecordedRequest {
    folder: string
    pageSize: number
    query: string
}

/**
 * Installs a fake Drive `files.list` endpoint on global.fetch.
 *
 * The mock emulates the real API in the one way that matters for these tests: it
 * honors the `q` mimeType filter. When the query carries `mimeType='...'` clauses,
 * only files whose mimeType is listed are returned. This is why a folder is
 * excluded from the response unless the query explicitly asks for the folder
 * mimeType - the exact behavior the secondary fix depends on.
 */
function installDriveMock(folderContents: { [folderId: string]: DriveFile[] }): RecordedRequest[] {
    const requests: RecordedRequest[] = []

    global.fetch = jest.fn(async (input: any) => {
        const url = new URL(typeof input === 'string' ? input : input.toString())
        const query = url.searchParams.get('q') || ''
        const pageSize = Number(url.searchParams.get('pageSize'))

        const folderMatch = query.match(/'([^']+)' in parents/)
        const folder = folderMatch ? folderMatch[1] : 'unknown'
        requests.push({ folder, pageSize, query })

        const allowedMimeTypes = (query.match(/mimeType='([^']+)'/g) || []).map((clause) =>
            clause.replace(/^mimeType='/, '').replace(/'$/, '')
        )

        const contents = folderContents[folder] || []
        const files = allowedMimeTypes.length > 0 ? contents.filter((file) => allowedMimeTypes.includes(file.mimeType)) : contents

        return {
            ok: true,
            statusText: 'OK',
            json: async () => ({ files })
        } as any
    }) as any

    return requests
}

describe('GoogleDrive document loader - getFilesFromFolder subfolder handling (#5063)', () => {
    const originalFetch = global.fetch

    afterEach(() => {
        global.fetch = originalFetch
        jest.restoreAllMocks()
    })

    // Invokes the (private) recursive lister with the real implementation.
    const listFolder = (folderId: string, fileTypes: string[] | undefined, maxFiles: number) => {
        const node = new nodeClass()
        return (node as any).getFilesFromFolder(folderId, 'fake-access-token', fileTypes, true, false, maxFiles)
    }

    it('never requests a pageSize <= 0 when recursion exhausts the file budget', async () => {
        // No fileTypes filter -> folders are returned regardless, so recursion is reachable.
        // maxFiles=2 and the root already yields 2 files, exhausting the budget before the subfolder.
        const requests = installDriveMock({
            root: [
                { id: 'f1', name: 'File 1', mimeType: 'text/plain' },
                { id: 'f2', name: 'File 2', mimeType: 'text/plain' },
                { id: 'sub', name: 'Subfolder', mimeType: FOLDER_MIME }
            ],
            sub: [{ id: 'f3', name: 'File 3', mimeType: 'text/plain' }]
        })

        const files = await listFolder('root', undefined, 2)

        // Every request must carry a valid pageSize in [1, 1000]. Pre-fix, the recursive call
        // computed Math.min(maxFiles - files.length, 1000) = Math.min(2 - 3, 1000) = -1,
        // producing a request with pageSize=-1 that Drive rejects with HTTP 400.
        expect(requests.length).toBeGreaterThan(0)
        for (const request of requests) {
            expect(request.pageSize).toBeGreaterThanOrEqual(1)
            expect(request.pageSize).toBeLessThanOrEqual(1000)
        }

        // The subfolder must not be queried at all once the budget is exhausted.
        expect(requests.some((request) => request.folder === 'sub')).toBe(false)
        expect(files.map((file: DriveFile) => file.id)).toEqual(['f1', 'f2'])
    })

    it('traverses subfolders even when the default fileTypes filter is set', async () => {
        // Default fileTypes does NOT include the folder mimeType. The mock therefore only
        // returns the subfolder if the query explicitly asks for the folder mimeType, which
        // is exactly what the secondary fix adds.
        const requests = installDriveMock({
            root: [
                { id: 'f1', name: 'Doc 1', mimeType: 'application/pdf' },
                { id: 'sub', name: 'Subfolder', mimeType: FOLDER_MIME }
            ],
            sub: [{ id: 'f2', name: 'Doc 2', mimeType: 'application/pdf' }]
        })

        const files = await listFolder('root', DEFAULT_FILE_TYPES, 50)

        // The subfolder was queried and its file was collected.
        expect(requests.some((request) => request.folder === 'sub')).toBe(true)
        expect(files.map((file: DriveFile) => file.id).sort()).toEqual(['f1', 'f2'])

        // The root query must ask for the folder mimeType so folders survive the filter.
        const rootRequest = requests.find((request) => request.folder === 'root')
        expect(rootRequest?.query).toContain(FOLDER_MIME)

        // Folders themselves are never returned as loadable files.
        expect(files.some((file: DriveFile) => file.mimeType === FOLDER_MIME)).toBe(false)
    })
})
