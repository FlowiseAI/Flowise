# Billing Usage Events Feature Implementation

## Overview
This feature adds detailed usage event tracking to the billing page, sourcing data primarily from Langfuse traces with Stripe synchronization status.

## Implementation Status
🟡 In Progress - Basic implementation complete, needs testing

## Changelog

### 2023-08-15 - Core Implementation
- Added new data models in `packages/server/src/aai-utils/billing/core/types.ts`:
  - `UsageEvent` interface for representing individual usage events
  - `UsageEventsResponse` interface for API responses
  - `GetUsageEventsParams` interface for query parameters

- Added backend functionality:
  - Added `getUsageEvents` method to `LangfuseProvider` class
  - Added `getUsageEvents` method to `BillingService` class
  - Added controller function in `packages/server/src/controllers/billing/index.ts`
  - Added API route `/api/billing/usage/events` in `packages/server/src/routes/billing/index.ts`

- Added frontend functionality:
  - Added API client method in `packages/ui/src/api/billing.js`
  - Created custom hook `useUsageEvents` in `packages-answers/ui/src/billing/hooks/useUsageEvents.ts`
  - Created `UsageEventsTable` component in `packages-answers/ui/src/billing/UsageEventsTable.tsx`
  - Updated billing page to include the new component

## Implementation Details

### Backend
The backend implementation fetches trace data from Langfuse and transforms it into a format suitable for the frontend. It includes:
- Pagination support
- Sorting by timestamp
- Filtering by customer ID
- Detailed credit breakdown (AI tokens, compute, storage)
- Synchronization status with Stripe

### Frontend
The frontend implementation displays usage events in a table with:
- Sorting capabilities
- Pagination controls
- Visual indicators for sync status (using colored chips)
- Breakdown of credit usage by type
- Responsive design

## Next Steps
- Add comprehensive testing
- Add documentation
- Cross-browser and responsiveness testing
- Deploy to staging and production environments

# Updates Log

## 2024-07-31 (updated)
- Added ExportImportComponent: Extracted export/import functionality from ProfileSection into a reusable component
- Updated AppDrawer: Added export/import functionality to the user menu
- Added TypeScript support: Created TypeScript versions of the components for better type safety
- Fixed linting errors in AppDrawer.tsx and ExportImportComponent.tsx
- Updated ExportImportComponent to use the same dependencies as ProfileSection
- Changed Billing icon from Star to Assessment icon to better represent usage and stats

### Files Changed
- `packages-answers/ui/src/components/ExportImportComponent.tsx`: TypeScript version of export/import functionality
- `packages-answers/ui/src/AppDrawer.tsx`: Updated to include export/import menu items in the user menu and changed Billing icon

## Updates - 2023-06-05: Billing System and Organization Statistics
- Implemented usage events endpoint to fetch detailed billing events
- Added organization statistics to the billing dashboard for admin users
- Fixed various linter errors in the codebase
- Updated BillingService initialization to properly handle errors
- Added proper error handling in billing controllers
- Restructured interfaces to support organization tracking in chat messages

### Files Changed
- `packages/server/src/aai-utils/billing/core/BillingService.ts`: Improved initialization and added usage events method
- `packages/server/src/controllers/billing/index.ts`: Added organization statistics for admin users
- `packages/server/src/aai-utils/billing/langfuse/LangfuseProvider.ts`: Implemented getUsageEvents method
- `packages/server/src/routes/billing/index.ts`: Added route for usage events
- `packages/server/src/Interface.ts`: Added organizationId to IChatMessage interface
- `packages/server/src/middlewares/authentication/enforceAbility.ts`: Fixed linter errors and improved error handling 