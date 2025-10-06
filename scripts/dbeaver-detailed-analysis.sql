-- DETAILED ANALYSIS TO UNDERSTAND THE MISMATCH
-- Run each query separately to understand the different scenarios

-- Query 1: Show ALL duplicate scenarios with detailed breakdown
SELECT 
    u.email,
    u."defaultChatflowId" as user_default,
    cf."parentChatflowId" as template_id,
    cf.id as chatflow_id,
    cf.name as chatflow_name,
    cf."createdDate",
    CASE WHEN cf.id::uuid = u."defaultChatflowId"::uuid THEN 'YES - USER DEFAULT' ELSE 'No' END as is_current_default,
    ROW_NUMBER() OVER (PARTITION BY cf."userId", cf."parentChatflowId" ORDER BY cf."createdDate") as age_rank,
    COUNT(*) OVER (PARTITION BY cf."userId", cf."parentChatflowId") as total_duplicates,
    CASE 
        WHEN cf.id::uuid = u."defaultChatflowId"::uuid THEN 'KEEP - User Default'
        WHEN cf.id::uuid != u."defaultChatflowId"::uuid AND 
             EXISTS (SELECT 1 FROM "chat_flow" cf2 WHERE cf2."userId" = cf."userId" 
                    AND cf2."parentChatflowId" = cf."parentChatflowId" 
                    AND cf2.id::uuid = u."defaultChatflowId"::uuid 
                    AND cf2."deletedDate" IS NULL) THEN 'DELETE - User default exists elsewhere'
        WHEN NOT EXISTS (SELECT 1 FROM "chat_flow" cf2 WHERE cf2."userId" = cf."userId" 
                        AND cf2."parentChatflowId" = cf."parentChatflowId" 
                        AND cf2.id::uuid = u."defaultChatflowId"::uuid 
                        AND cf2."deletedDate" IS NULL) THEN 'COMPLEX - User default not in this group'
        ELSE 'UNKNOWN'
    END as recommended_action
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
ORDER BY u.email, cf."parentChatflowId", cf."createdDate";
