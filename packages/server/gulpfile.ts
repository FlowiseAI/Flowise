import { dest, src } from 'gulp'

function copyEmailTemplates() {
    return src(['src/enterprise/emails/*.hbs']).pipe(dest('dist/enterprise/emails'))
}

exports.default = copyEmailTemplates
