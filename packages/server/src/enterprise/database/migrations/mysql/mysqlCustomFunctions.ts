import { QueryRunner } from 'typeorm'

export const ensureColumnExists = async (
    queryRunner: QueryRunner,
    tableName: string,
    columnName: string,
    columnType: string // Accept column type as a parameter
): Promise<void> => {
    // Check if the specified column exists in the given table
    const columnCheck = await queryRunner.query(
        `
        SELECT COLUMN_NAME 
        FROM information_schema.COLUMNS 
        WHERE TABLE_NAME = ? AND COLUMN_NAME = ? AND TABLE_SCHEMA = ?
    `,
        [tableName, columnName, queryRunner.connection.options.database]
    )

    // Check if the column exists
    const columnExists = columnCheck.length > 0

    if (!columnExists) {
        // Add the column if it does not exist
        await queryRunner.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType};`)
    }
}
