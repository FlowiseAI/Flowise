import { z } from 'zod'

export enum UserStatus {
    INVITED = 'invited',
    DISABLED = 'disabled',
    ACTIVE = 'active'
}

export class IUser {
    id: string
    email: string
    name: string
    credential: string
    status: UserStatus
    tempToken: string
    tokenExpiry?: Date
    role: string
    lastLogin: Date
    activeWorkspaceId: string
    loginMode?: string
    activeOrganizationId?: string
}

export interface IWorkspaceUser {
    id: string
    workspaceId: string
    userId: string
    role: string
}

export interface IWorkspaceShared {
    id: string
    workspaceId: string
    sharedItemId: string
    itemType: string
    createdDate: Date
    updatedDate: Date
}

export interface ILoginActivity {
    id: string
    username: string
    activityCode: number
    message: string
    loginMode: string
    attemptedDateTime: Date
}

export enum LoginActivityCode {
    LOGIN_SUCCESS = 0,
    LOGOUT_SUCCESS = 1,
    UNKNOWN_USER = -1,
    INCORRECT_CREDENTIAL = -2,
    USER_DISABLED = -3,
    NO_ASSIGNED_WORKSPACE = -4,
    INVALID_LOGIN_MODE = -5,
    REGISTRATION_PENDING = -6,
    UNKNOWN_ERROR = -99
}

export type IAssignedWorkspace = { id: string; name: string; role: string; organizationId: string }
export type LoggedInUser = {
    id: string
    email: string
    name: string
    roleId: string
    activeOrganizationId: string
    activeOrganizationSubscriptionId: string
    activeOrganizationCustomerId: string
    activeOrganizationProductId: string
    isOrganizationAdmin: boolean
    activeWorkspaceId: string
    activeWorkspace: string
    assignedWorkspaces: IAssignedWorkspace[]
    permissions?: string[]
    features?: Record<string, string>
    ssoRefreshToken?: string
    ssoToken?: string
    ssoProvider?: string
}

export enum ErrorMessage {
    INVALID_MISSING_TOKEN = 'Invalid or Missing token',
    TOKEN_EXPIRED = 'Token Expired',
    REFRESH_TOKEN_EXPIRED = 'Refresh Token Expired',
    FORBIDDEN = 'Forbidden',
    UNKNOWN_USER = 'Unknown Username or Password',
    INCORRECT_PASSWORD = 'Incorrect Password',
    INACTIVE_USER = 'Inactive User',
    INVITED_USER = 'User Invited, but has not registered',
    INVALID_WORKSPACE = 'No Workspace Assigned',
    UNKNOWN_ERROR = 'Unknown Error'
}

// IMPORTANT: update the schema on the client side as well
// packages/ui/src/views/organization/index.jsx
export const OrgSetupSchema = z
    .object({
        orgName: z.string().min(1, 'Organization name is required'),
        username: z.string().min(1, 'Name is required'),
        email: z.string().min(1, 'Email is required').email('Invalid email address'),
        password: z
            .string()
            .min(8, 'Password must be at least 8 characters')
            .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
            .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
            .regex(/\d/, 'Password must contain at least one digit')
            .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),
        confirmPassword: z.string().min(1, 'Confirm Password is required')
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords don't match",
        path: ['confirmPassword']
    })

// IMPORTANT: when updating this schema, update the schema on the server as well
// packages/ui/src/views/auth/register.jsx
export const RegisterUserSchema = z
    .object({
        username: z.string().min(1, 'Name is required'),
        email: z.string().min(1, 'Email is required').email('Invalid email address'),
        password: z
            .string()
            .min(8, 'Password must be at least 8 characters')
            .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
            .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
            .regex(/\d/, 'Password must contain at least one digit')
            .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),
        confirmPassword: z.string().min(1, 'Confirm Password is required'),
        token: z.string().min(1, 'Invite Code is required')
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords don't match",
        path: ['confirmPassword']
    })
