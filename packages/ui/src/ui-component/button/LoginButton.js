import { SignedOut, SignInButton, useUser, UserButton } from '@clerk/clerk-react'

export default function Component() {
    const { user, isLoaded } = useUser()
    return (
        <div>
            <SignedOut>
                <SignInButton />
            </SignedOut>

            {isLoaded && user && (
                <>
                    <UserButton afterSignOutUrl='/' />
                </>
            )}
        </div>
    )
}
