function isDraft(entity) {
    return !entity.sys.publishedVersion
}
function isChanged(entity) {
    return !!entity.sys.publishedVersion && entity.sys.version >= entity.sys.publishedVersion + 2
}
function isPublished(entity) {
    return !!entity.sys.publishedVersion && entity.sys.version == entity.sys.publishedVersion + 1
}
function isArchived(entity) {
    return !!entity.sys.archivedVersion
}

module.exports = {
    isDraft,
    isChanged,
    isPublished,
    isArchived
}
