# Chatflows Service - Field Selection Feature

## Overview

The chatflows service now supports field selection through the `filter.select` parameter **only on the `getAdminChatflows` function**. This allows you to specify which fields to return from the database, improving performance and reducing data transfer for admin operations.

## Usage

### Filter Structure

```typescript
type ChatflowsFilter = {
    visibility?: string
    auth0_org_id?: string
    select?: string[] // Array of field names to select (only for getAdminChatflows)
}
```

### Examples

#### Get chatflow with specific fields for admin view

```typescript
const filter: ChatflowsFilter = {
    visibility: 'Public,Private',
    select: ['name', 'description', 'visibility', 'isPublic', 'deployed', 'userId']
}

const chatflows = await chatflowsService.getAdminChatflows(user, 'CHATFLOW', filter)
```

### Available Fields

The following fields can be selected from the ChatFlow entity:

-   `id` (always included)
-   `name`
-   `description`
-   `flowData`
-   `deployed`
-   `isPublic`
-   `apikeyid`
-   `chatbotConfig`
-   `visibility`
-   `answersConfig`
-   `apiConfig`
-   `analytic`
-   `speechToText`
-   `followUpPrompts`
-   `category`
-   `type`
-   `browserExtConfig`
-   `parentChatflowId`
-   `userId`
-   `organizationId`
-   `createdDate`
-   `updatedDate`
-   `deletedDate`

### API Usage

#### GET /admin/chatflows

```bash
# Admin endpoint with field selection
curl "http://localhost:3000/admin/chatflows?filter=%7B%22select%22%3A%5B%22name%22%2C%22userId%22%2C%22organizationId%22%5D%7D"

# Admin endpoint with visibility filter and field selection
curl "http://localhost:3000/admin/chatflows?filter=%7B%22visibility%22%3A%22Public%22%2C%22select%22%3A%5B%22name%22%2C%22type%22%2C%22createdDate%22%5D%7D"
```

#### Client-side usage:

```javascript
const filter = { select: ['name', 'description', 'type'] }
const chatflows = await chatflowsApi.getAdminChatflows(filter)
```

### Notes

1. The `id` field is always included in the response for proper entity mapping
2. If no `select` filter is provided, all fields are returned (default behavior)
3. The field selection is applied at the database query level for optimal performance
4. Computed fields like `badge`, `isOwner`, and `canEdit` are still added to the response
5. Field selection works with all existing filters (visibility, auth0_org_id, etc.)

### Performance Benefits

-   Reduces network bandwidth by transferring only needed data
-   Improves query performance by selecting fewer columns
-   Useful for list views where full chatflow data isn't needed
-   Particularly beneficial for large chatflow datasets
