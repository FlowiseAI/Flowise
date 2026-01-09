import { QueryRunner } from 'typeorm'

export async function hasColumn(queryRunner: QueryRunner, tableName: string, columnName: string): Promise<boolean> {
    const table = await queryRunner.getTable(tableName)

    if (!table) {
        throw new Error(`Table ${tableName} not found`)
    }

    const hasColumn = table.columns.some((column) => column.name === columnName)

    return hasColumn
}
