-- IMPROVED DELETE GENERATION
-- Run each query separately to avoid UNION syntax issues

-- Query 1: Generate DELETEs for straightforward cases (user default exists in group)
SELECT 
    'SAFE DELETE' as category,
    u.email,
    cf.id as chatflow_to_delete,
    cf.name as chatflow_name,
    cf."createdDate",
    cf."parentChatflowId",
    'Safe - User default exists in this group' as reason,
    'DELETE FROM "chat_flow" WHERE id = ''' || cf.id || ''';' as delete_statement
FROM "chat_flow" cf
JOIN "user" u ON cf."userId" = u.id
WHERE cf."parentChatflowId" IS NOT NULL 
  AND cf."deletedDate" IS NULL
  AND cf.id::uuid != u."defaultChatflowId"::uuid  -- Not the user's default
  AND (cf."userId", cf."parentChatflowId") IN (
    SELECT "userId", "parentChatflowId"
    FROM "chat_flow"
    WHERE "parentChatflowId" IS NOT NULL 
      AND "deletedDate" IS NULL
    GROUP BY "userId", "parentChatflowId"
    HAVING COUNT(*) > 1
  )
  AND EXISTS (
    -- User's default exists in this duplicate group
    SELECT 1 FROM "chat_flow" cf2 
    WHERE cf2."userId" = cf."userId" 
      AND cf2."parentChatflowId" = cf."parentChatflowId" 
      AND cf2.id::uuid = u."defaultChatflowId"::uuid 
      AND cf2."deletedDate" IS NULL
  )
ORDER BY email, "parentChatflowId", "createdDate";

-- Query 2: Generate DELETEs for complex cases (keep oldest when user default is elsewhere)
-- RUN THIS SEPARATELY
SELECT 
    'COMPLEX DELETE' as category,
    u.email,
    cf.id as chatflow_to_delete,
    cf.name as chatflow_name,
    cf."createdDate",
    cf."parentChatflowId",
    'Keep oldest - User default is for different template' as reason,
    'DELETE FROM "chat_flow" WHERE id = ''' || cf.id || ''';' as delete_statement
FROM "chat_flow" cf
JOIN "user" u ON cf."userId" = u.id
WHERE cf."parentChatflowId" IS NOT NULL 
  AND cf."deletedDate" IS NULL
  AND (cf."userId", cf."parentChatflowId") IN (
    SELECT "userId", "parentChatflowId"
    FROM "chat_flow"
    WHERE "parentChatflowId" IS NOT NULL 
      AND "deletedDate" IS NULL
    GROUP BY "userId", "parentChatflowId"
    HAVING COUNT(*) > 1
  )
  AND NOT EXISTS (
    -- User's default does NOT exist in this duplicate group
    SELECT 1 FROM "chat_flow" cf2 
    WHERE cf2."userId" = cf."userId" 
      AND cf2."parentChatflowId" = cf."parentChatflowId" 
      AND cf2.id::uuid = u."defaultChatflowId"::uuid 
      AND cf2."deletedDate" IS NULL
  )
  AND cf."createdDate" > (
    -- Only delete if this is NOT the oldest in the group
    SELECT MIN("createdDate")
    FROM "chat_flow" cf3
    WHERE cf3."userId" = cf."userId"
      AND cf3."parentChatflowId" = cf."parentChatflowId"
      AND cf3."deletedDate" IS NULL
  )
ORDER BY email, "parentChatflowId", "createdDate";
