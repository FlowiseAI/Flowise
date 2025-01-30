import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm'

export class CreateActionRequest1706669700000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'action_request',
                columns: [
                    {
                        name: 'id',
                        type: 'varchar',
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: 'uuid'
                    },
                    {
                        name: 'flow_id',
                        type: 'varchar'
                    },
                    {
                        name: 'session_id',
                        type: 'varchar'
                    },
                    {
                        name: 'node_id',
                        type: 'varchar'
                    },
                    {
                        name: 'status',
                        type: 'varchar',
                        default: "'pending'"
                    },
                    {
                        name: 'output_types',
                        type: 'text'  // SQLite doesn't support arrays, store as JSON string
                    },
                    {
                        name: 'context',
                        type: 'text'  // SQLite JSON as text
                    },
                    {
                        name: 'args',
                        type: 'text',  // SQLite JSON as text
                        isNullable: true
                    },
                    {
                        name: 'response',
                        type: 'text',  // SQLite JSON as text
                        isNullable: true
                    },
                    {
                        name: 'created_at',
                        type: 'datetime',
                        default: "datetime('now')"
                    },
                    {
                        name: 'updated_at',
                        type: 'datetime',
                        default: "datetime('now')"
                    },
                    {
                        name: 'deleted_at',
                        type: 'datetime',
                        isNullable: true
                    }
                ],
                foreignKeys: [
                    {
                        name: 'FK_ACTION_REQUEST_FLOW',
                        columnNames: ['flow_id'],
                        referencedTableName: 'chatflow',
                        referencedColumnNames: ['id'],
                        onDelete: 'CASCADE'
                    }
                ]
            })
        )

        // Create indices
        await queryRunner.createIndices('action_request', [
            new TableIndex({
                name: 'IDX_ACTION_REQUEST_FLOW_ID',
                columnNames: ['flow_id']
            }),
            new TableIndex({
                name: 'IDX_ACTION_REQUEST_SESSION_ID',
                columnNames: ['session_id']
            }),
            new TableIndex({
                name: 'IDX_ACTION_REQUEST_NODE_ID',
                columnNames: ['node_id']
            }),
            new TableIndex({
                name: 'IDX_ACTION_REQUEST_STATUS',
                columnNames: ['status']
            })
        ])

        // Create trigger for updated_at
        await queryRunner.query(`
            CREATE TRIGGER action_request_updated_at
            AFTER UPDATE ON action_request
            FOR EACH ROW
            BEGIN
                UPDATE action_request SET updated_at = datetime('now')
                WHERE id = OLD.id;
            END;
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TRIGGER IF EXISTS action_request_updated_at')
        await queryRunner.dropIndices('action_request', [
            new TableIndex({
                name: 'IDX_ACTION_REQUEST_FLOW_ID',
                columnNames: ['flow_id']
            }),
            new TableIndex({
                name: 'IDX_ACTION_REQUEST_SESSION_ID',
                columnNames: ['session_id']
            }),
            new TableIndex({
                name: 'IDX_ACTION_REQUEST_NODE_ID',
                columnNames: ['node_id']
            }),
            new TableIndex({
                name: 'IDX_ACTION_REQUEST_STATUS',
                columnNames: ['status']
            })
        ])
        await queryRunner.dropTable('action_request')
    }
} 