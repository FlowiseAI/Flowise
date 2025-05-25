import { QueryRunner } from 'typeorm'

export const ensureColumnExists = async (
    queryRunner: QueryRunner,
    tableName: string,
    columnName: string,
    columnType: string // Accept column type as a parameter
): Promise<void> => {
    // Retrieve column information from the specified table
    const columns = await queryRunner.query(`PRAGMA table_info(${tableName});`)

    // Check if the specified column exists
    const columnExists = columns.some((col: any) => col.name === columnName)

    // Check if the specified column exists in the returned columns
    if (!columnExists) {
        // Add the column if it does not exist
        await queryRunner.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType};`)
    }
}
