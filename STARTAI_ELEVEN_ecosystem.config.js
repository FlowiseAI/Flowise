module.exports = {
    apps: [
        {
            name: 'STARTAI_ELEVEN',
            script: './node_modules/pnpm/bin/pnpm.cjs',
            args: 'start',
            watch: false,
            env: {
                NODE_ENV: 'STARTAI_ELEVEN',
                PORT: 3032
            }
        }
    ]
}
