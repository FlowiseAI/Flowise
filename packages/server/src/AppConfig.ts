const parseBooleanEnv = (value: string | undefined, defaultValue: boolean) => {
    if (value === undefined) {
        return defaultValue
    }

    return value.trim().toLowerCase() === 'true'
}

export const appConfig = {
    showCommunityNodes: parseBooleanEnv(process.env.SHOW_COMMUNITY_NODES, false)
    // todo: add more config options here like database, log, storage, credential and allow modification from UI
}
