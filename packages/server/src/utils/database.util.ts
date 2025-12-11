import { QueryRunner } from 'typeorm'

export async function hasColumn(queryRunner: QueryRunner, tableName: string, columnName: string): Promise<boolean> {
    const table = await queryRunner.getTable(tableName)

    const hasColumn = table!.columns.some((column) => column.name === columnName)

    return hasColumn
}
