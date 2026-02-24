import { Column, Entity, PrimaryColumn } from 'typeorm'

@Entity({ name: 'login_sessions' })
export class LoginSession {
    @PrimaryColumn({ type: 'varchar' })
    sid: string

    @Column({ type: 'text' })
    sess: string

    @Column({ type: 'bigint', nullable: true })
    expire?: number
}
