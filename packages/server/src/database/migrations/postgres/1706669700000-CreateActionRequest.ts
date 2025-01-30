import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm'

export class CreateActionRequest1706669700000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create enum type for status
        await queryRunner.query(`
            CREATE TYPE action_request_status_enum AS ENUM (
                'pending',
                'completed',
                'expired',
                'cancelled'
            )
        `)

        await queryRunner.createTable(
            new Table({
                name: 'action_request',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: 'uuid'
                    },
                    {
                        name: 'flow_id',
                        type: 'uuid'
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
                        type: 'action_request_status_enum',
                        default: "'pending'"
                    },
                    {
                        name: 'output_types',
                        type: 'text',
                        isArray: true
                    },
                    {
                        name: 'context',
                        type: 'jsonb'
                    },
                    {
                        name: 'args',
                        type: 'jsonb',
                        isNullable: true
                    },
                    {
                        name: 'response',
                        type: 'jsonb',
                        isNullable: true
                    },
                    {
                        name: 'created_at',
                        type: 'timestamp',
                        default: 'now()'
                    },
                    {
                        name: 'updated_at',
                        type: 'timestamp',
                        default: 'now()'
                    },
                    {
                        name: 'deleted_at',
                        type: 'timestamp',
                        isNullable: true
                    }
                ]
            })
        )

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

        await queryRunner.createForeignKey(
            'action_request',
            new TableForeignKey({
                name: 'FK_ACTION_REQUEST_FLOW',
                columnNames: ['flow_id'],
                referencedColumnNames: ['id'],
                referencedTableName: 'chatflow',
                onDelete: 'CASCADE'
            })
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropForeignKey('action_request', 'FK_ACTION_REQUEST_FLOW')
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
        await queryRunner.query('DROP TYPE action_request_status_enum')
    }
} 