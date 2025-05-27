import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { ILoginActivity, IWorkspaceShared, IWorkspaceUser } from '../../Interface.Enterprise'

@Entity('workspace_users')
export class WorkspaceUsers implements IWorkspaceUser {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({ type: 'text' })
    workspaceId: string

    @Column({ type: 'text' })
    userId: string

    @Column({ type: 'text' })
    role: string
}

@Entity('workspace_shared')
export class WorkspaceShared implements IWorkspaceShared {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({ type: 'text' })
    workspaceId: string

    @Column({ type: 'text' })
    sharedItemId: string

    @Column({ type: 'text', name: 'itemType' })
    itemType: string

    @Column({ type: 'timestamp' })
    @UpdateDateColumn()
    createdDate: Date

    @Column({ type: 'timestamp' })
    @UpdateDateColumn()
    updatedDate: Date
}

@Entity('login_activity')
export class LoginActivity implements ILoginActivity {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({ type: 'text' })
    username: string

    @Column({ name: 'activity_code' })
    activityCode: number

    @Column({ name: 'login_mode' })
    loginMode: string

    @Column({ type: 'text' })
    message: string

    @Column({ type: 'timestamp' })
    @UpdateDateColumn()
    attemptedDateTime: Date
}
