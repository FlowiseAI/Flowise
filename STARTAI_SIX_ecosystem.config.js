module.exports = {
    apps: [
        {
            name: 'STARTAI_SIX',
            script: './node_modules/pnpm/bin/pnpm.cjs',
            args: 'start',
            watch: false,
            env: {
                NODE_ENV: 'STARTAI_SIX',
                PORT: 3027
            }
        }
    ]
}
