const { src, dest } = require('gulp')

function copyIcons() {
    return src(['nodes/**/*.{jpg,png,svg}']).pipe(dest('dist/nodess'))
}

exports.default = copyIcons
