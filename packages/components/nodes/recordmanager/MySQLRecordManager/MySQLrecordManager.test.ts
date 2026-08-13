const mockDataSourceInstances: Array<{
    isInitialized: boolean
    initialize: jest.Mock
    destroy: jest.Mock
    createQueryRunner: jest.Mock
}> = []

const mockQueryRunners: Array<{
    isReleased: boolean
    manager: {
        query: jest.Mock
    }
    release: jest.Mock
}> = []

jest.mock('typeorm', () => {
    class MockDataSource {
        options: unknown
        isInitialized = false
        initialize = jest.fn(async () => {
            this.isInitialized = true
            return this
        })
        destroy = jest.fn(async () => {
            this.isInitialized = false
        })
        createQueryRunner = jest.fn(() => {
            const queryRunner = {
                isReleased: false,
                manager: {
                    query: jest.fn(async (query: string) => {
                        if (query.includes('UNIX_TIMESTAMP')) {
                            return [{ epoch: '123' }]
                        }

                        if (query.includes('SELECT `key`')) {
                            return [{ key: 'a' }]
                        }

                        return []
                    })
                },
                release: jest.fn(async () => {
                    queryRunner.isReleased = true
                })
            }

            mockQueryRunners.push(queryRunner)
            return queryRunner
        })

        constructor(options: unknown) {
            this.options = options
            mockDataSourceInstances.push(this)
        }
    }

    return {
        DataSource: MockDataSource
    }
})

const { MySQLRecordManager } = require('./MySQLrecordManager')

const createManager = (tableName = 'upsertion_records') =>
    new MySQLRecordManager('test_namespace', {
        mysqlOptions: {
            type: 'mysql',
            host: 'localhost',
            port: 3306,
            username: 'user',
            password: 'password',
            database: 'flowise'
        },
        tableName
    })

describe('MySQLRecordManager connection lifecycle', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockDataSourceInstances.length = 0
        mockQueryRunners.length = 0
    })

    it('reuses one initialized DataSource across operations and destroys it only on close', async () => {
        const manager = createManager()

        await expect(manager.exists(['a'])).resolves.toEqual([true])
        await expect(manager.listKeys()).resolves.toEqual(['a'])
        await expect(manager.getTime()).resolves.toBe(123)

        expect(mockDataSourceInstances).toHaveLength(1)
        expect(mockDataSourceInstances[0].initialize).toHaveBeenCalledTimes(1)
        expect(mockDataSourceInstances[0].destroy).not.toHaveBeenCalled()
        expect(mockDataSourceInstances[0].createQueryRunner).toHaveBeenCalledTimes(3)
        expect(mockQueryRunners).toHaveLength(3)
        mockQueryRunners.forEach((queryRunner) => {
            expect(queryRunner.release).toHaveBeenCalledTimes(1)
            expect(queryRunner.isReleased).toBe(true)
        })

        await manager.close()

        expect(mockDataSourceInstances[0].destroy).toHaveBeenCalledTimes(1)
        expect(mockDataSourceInstances[0].isInitialized).toBe(false)
    })

    it('shares the pending DataSource initialization across concurrent operations', async () => {
        const manager = createManager()

        await expect(Promise.all([manager.exists(['a']), manager.listKeys()])).resolves.toEqual([[true], ['a']])

        expect(mockDataSourceInstances).toHaveLength(1)
        expect(mockDataSourceInstances[0].initialize).toHaveBeenCalledTimes(1)
        expect(mockDataSourceInstances[0].destroy).not.toHaveBeenCalled()
        expect(mockDataSourceInstances[0].createQueryRunner).toHaveBeenCalledTimes(2)

        await manager.close()
    })

    it('destroys the cached DataSource once when close is called concurrently', async () => {
        const manager = createManager()

        await expect(manager.getTime()).resolves.toBe(123)
        await Promise.all([manager.close(), manager.close()])

        expect(mockDataSourceInstances).toHaveLength(1)
        expect(mockDataSourceInstances[0].destroy).toHaveBeenCalledTimes(1)
        expect(mockDataSourceInstances[0].isInitialized).toBe(false)
    })

    it('uses the active query runner for update time checks', async () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)
        const manager = createManager()

        await expect(manager.update(['a'], { timeAtLeast: 999 })).rejects.toThrow('Time sync issue with database 123 < 999')

        expect(mockDataSourceInstances).toHaveLength(1)
        expect(mockDataSourceInstances[0].destroy).not.toHaveBeenCalled()
        expect(mockDataSourceInstances[0].createQueryRunner).toHaveBeenCalledTimes(1)
        expect(mockQueryRunners).toHaveLength(1)
        expect(mockQueryRunners[0].manager.query).toHaveBeenCalledTimes(1)
        expect(mockQueryRunners[0].manager.query).toHaveBeenCalledWith('SELECT UNIX_TIMESTAMP(NOW()) AS epoch')
        mockQueryRunners.forEach((queryRunner) => {
            expect(queryRunner.release).toHaveBeenCalledTimes(1)
            expect(queryRunner.isReleased).toBe(true)
        })

        await manager.close()
        consoleErrorSpy.mockRestore()
    })

    it('releases query runners when table name validation fails', async () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)
        const manager = createManager('invalid-table-name')

        await expect(manager.exists(['a'])).rejects.toThrow('Invalid table name')
        await expect(manager.listKeys()).rejects.toThrow('Invalid table name')
        await expect(manager.deleteKeys(['a'])).rejects.toThrow('Invalid table name')

        expect(mockDataSourceInstances).toHaveLength(1)
        expect(mockDataSourceInstances[0].destroy).not.toHaveBeenCalled()
        expect(mockDataSourceInstances[0].createQueryRunner).toHaveBeenCalledTimes(3)
        expect(mockQueryRunners).toHaveLength(3)
        mockQueryRunners.forEach((queryRunner) => {
            expect(queryRunner.manager.query).not.toHaveBeenCalled()
            expect(queryRunner.release).toHaveBeenCalledTimes(1)
            expect(queryRunner.isReleased).toBe(true)
        })

        await manager.close()
        consoleErrorSpy.mockRestore()
    })
})
