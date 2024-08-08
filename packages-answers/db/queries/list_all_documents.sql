SELECT u.id, o.name, d.*
FROM "User" u
JOIN "_UserOrganzations" uo ON uo."B" = u."id"
JOIN "Organization" o ON o."id" = uo."A"
JOIN "DocumentPermission" dp ON dp."organizationId" = o."id"
JOIN "Document" d ON d."id" = dp."documentId"
WHERE u.email = 'max@lastrev.com';