/* eslint-disable */
import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm'
import { AppCsvParseRowStatus, IAppCsvParseRows } from '../../Interface'
import { ICommonObject } from 'flowise-components'

@Entity()
export class AppCsvParseRows implements IAppCsvParseRows {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Index()
    @Column({ type: 'uuid' })
    csvParseRunId: string

    @Column({ type: 'integer' })
    rowNumber: number

    @Column({ type: 'json' })
    rowData: ICommonObject

    @Column({ type: 'json', nullable: true })
    generatedData?: ICommonObject

    @Column({ type: 'text' })
    status: AppCsvParseRowStatus

    @Column({ type: 'text', nullable: true })
    errorMessage?: string

    @Column({ type: 'timestamp' })
    createdAt: Date

    @Column({ type: 'timestamp' })
    updatedAt: Date
}
