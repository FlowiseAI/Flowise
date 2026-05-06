const { src, dest, parallel } = require('gulp')

function copyIcons() {
    return src(['nodes/**/*.{jpg,png,svg}']).pipe(dest('dist/nodes'))
}

function copyBuiltinSkills() {
    return src(['nodes/agentflow/SmartAgent/skills/builtin/**/*.md']).pipe(dest('dist/nodes/agentflow/SmartAgent/skills/builtin'))
}

exports.default = parallel(copyIcons, copyBuiltinSkills)
