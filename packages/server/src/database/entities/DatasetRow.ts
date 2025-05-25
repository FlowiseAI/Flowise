/* eslint-disable */
import { Entity, Column, CreateDateColumn, UpdateDateColumn, PrimaryGeneratedColumn, Index } from 'typeorm'
import { IAssistant, IDataset, IDatasetRow } from '../../Interface'

@Entity()
export class DatasetRow implements IDatasetRow {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({ type: 'text' })
    @Index()
    datasetId: string

    @Column({ type: 'text' })
    input: string

    @Column({ type: 'text' })
    output: string

    @UpdateDateColumn()
    updatedDate: Date

    @Column({ name: 'sequence_no' })
    sequenceNo: number
}
