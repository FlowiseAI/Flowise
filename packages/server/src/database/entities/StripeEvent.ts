import { Entity, Column, CreateDateColumn, PrimaryGeneratedColumn } from 'typeorm'
import { IStripeEvent } from '../../Interface'

@Entity()
export class StripeEvent implements IStripeEvent {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({ unique: true })
    stripeEventId: string

    @Column()
    eventType: string

    @Column({ type: 'jsonb' })
    eventData: any

    @Column({ default: false })
    processed: boolean

    @Column({ type: 'timestamp with time zone' })
    @CreateDateColumn()
    createdDate: Date
}
