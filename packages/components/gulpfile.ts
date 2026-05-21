const { src, dest, parallel } = require('gulp')

function copyIcons() {
    return src(['nodes/**/*.{jpg,png,svg}']).pipe(dest('dist/nodes'))
}

// Built-in sandbox helpers ship as plain Python scripts that get
// materialised into every Skill sandbox VM. They live next to the
// compiled JS so __dirname-relative reads work in both source (ts-jest)
// and dist contexts. See nodes/tools/Skill/sandbox/builtinHelpers/.
function copyBuiltinHelperScripts() {
    return src(['nodes/**/builtinHelpers/scripts/**/*.py']).pipe(dest('dist/nodes'))
}

exports.default = parallel(copyIcons, copyBuiltinHelperScripts)
