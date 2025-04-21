# Billing Usage Events Feature Implementation

## Overview

This feature adds detailed usage event tracking to the billing page, sourcing data primarily from Langfuse traces with Stripe synchronization status.

## Implementation Status

🟡 In Progress - Basic implementation complete, needs testing

## Changelog

### Core Implementation

-   Added new data models in `packages/server/src/aai-utils/billing/core/types.ts`:

    -   `UsageEvent` interface for representing individual usage events
    -   `UsageEventsResponse` interface for API responses
    -   `GetUsageEventsParams` interface for query parameters

-   Added backend functionality:

    -   Added `getUsageEvents` method to `LangfuseProvider` class
    -   Added `getUsageEvents` method to `BillingService` class
    -   Added controller function in `packages/server/src/controllers/billing/index.ts`
    -   Added API route `/api/billing/usage/events` in `packages/server/src/routes/billing/index.ts`

-   Added frontend functionality:
    -   Added API client method in `packages/ui/src/api/billing.js`
    -   Created custom hook `useUsageEvents` in `packages-answers/ui/src/billing/hooks/useUsageEvents.ts`
    -   Created `UsageEventsTable` component in `packages-answers/ui/src/billing/UsageEventsTable.tsx`
    -   Updated billing page to include the new component

## Implementation Details

### Backend

The backend implementation fetches trace data from Langfuse and transforms it into a format suitable for the frontend. It includes:

-   Pagination support
-   Sorting by timestamp
-   Filtering by customer ID
-   Detailed credit breakdown (AI tokens, compute, storage)
-   Synchronization status with Stripe

### Frontend

The frontend implementation displays usage events in a table with:

-   Sorting capabilities
-   Pagination controls
-   Visual indicators for sync status (using colored chips)
-   Breakdown of credit usage by type
-   Responsive design

## Next Steps

-   Add comprehensive testing
-   Add documentation
-   Cross-browser and responsiveness testing
-   Deploy to staging and production environments

# Updates Log

## BillingService Optimization

-   Changed BillingService from singleton to per-request instantiation to fix memory issues
-   Made customerId optional in GetUsageEventsParams to handle unauthenticated users
-   Added UsageEventsTable component to billing UI
-   Updated UI layouts and imports for better performance
-   Fixed code style issues and linting errors

## (updated)

-   Added ExportImportComponent: Extracted export/import functionality from ProfileSection into a reusable component
-   Updated AppDrawer: Added export/import functionality to the user menu
-   Added TypeScript support: Created TypeScript versions of the components for better type safety
-   Fixed linting errors in AppDrawer.tsx and ExportImportComponent.tsx
-   Updated ExportImportComponent to use the same dependencies as ProfileSection
-   Changed Billing icon from Star to Assessment icon to better represent usage and stats

### Files Changed

-   `packages-answers/ui/src/components/ExportImportComponent.tsx`: TypeScript version of export/import functionality
-   `packages-answers/ui/src/AppDrawer.tsx`: Updated to include export/import menu items in the user menu and changed Billing icon

##Billing System and Organization Statistics

-   Implemented usage events endpoint to fetch detailed billing events
-   Added organization statistics to the billing dashboard for admin users
-   Fixed various linter errors in the codebase
-   Updated BillingService initialization to properly handle errors
-   Added proper error handling in billing controllers
-   Restructured interfaces to support organization tracking in chat messages

### Files Changed

-   `packages/server/src/aai-utils/billing/core/BillingService.ts`: Improved initialization and added usage events method
-   `packages/server/src/controllers/billing/index.ts`: Added organization statistics for admin users
-   `packages/server/src/aai-utils/billing/langfuse/LangfuseProvider.ts`: Implemented getUsageEvents method
-   `packages/server/src/routes/billing/index.ts`: Added route for usage events
-   `packages/server/src/Interface.ts`: Added organizationId to IChatMessage interface
-   `packages/server/src/middlewares/authentication/enforceAbility.ts`: Fixed linter errors and improved error handling

# Updates

## Replaced tinycolor2 with Lightweight Native Implementation

### Changes:

-   Replaced the tinycolor2 dependency with a custom lightweight color utility
-   Created a new colorUtils.js module that provides the same functionality
-   Removed tinycolor2 from package.json dependencies
-   Updated generateThemeColors.js to use the new implementation
-   Reduced bundle size by eliminating an external dependency

### Benefits:

-   Smaller bundle size with no external dependency
-   Native JavaScript implementation with no runtime dependencies
-   Same functionality as the original library for our use cases
-   Simplified color manipulation with focused implementation

### Files Changed:

-   Added `packages/ui/src/utils/colorUtils.js`: New lightweight color utility
-   Modified `packages/ui/src/utils/generateThemeColors.js`: Updated imports and usage
-   Modified `packages/ui/package.json`: Removed tinycolor2 dependency

## Chatbot Configuration Fix

### Changes:

-   Fixed an issue in the Canvas component where chatbotConfig handling was inconsistent
-   Added proper serialization of chatbotConfig object before saving
-   Added debug logging to help trace configuration values
-   Simplified config handling when updating existing chatflows

### Files Changed:

-   `packages/ui/src/views/canvas/index.jsx`

## ProfileSection Component Refactoring

### Overview

Refactored the ProfileSection component by extracting components and dynamic pieces to improve maintainability and enable code splitting.

### Changes Made

1. **Created New Components:**

    - `ExportDialog.jsx` - Extracted to a separate component in `packages/ui/src/ui-component/dialog/ExportDialog.jsx`
    - `ProfileAvatar.jsx` - Created as a separate component for the avatar button
    - `ProfileMenu.jsx` - Created as a separate component for the dropdown menu
    - `profileUtils.js` - Created a utility file for import/export functionality

2. **Updated ProfileSection Component:**

    - Replaced inline components with dynamic imports
    - Simplified component by extracting logic to utility functions
    - Improved code organization and readability

3. **Benefits:**
    - Better separation of concerns
    - Reduced main component complexity
    - Enabled lazy loading for better performance
    - Improved maintainability

### Files Changed

-   `packages/ui/src/layout/MainLayout/Header/ProfileSection/index.jsx`
-   `packages/ui/src/ui-component/dialog/ExportDialog.jsx` (new)
-   `packages/ui/src/layout/MainLayout/Header/ProfileSection/ProfileAvatar.jsx` (new)
-   `packages/ui/src/layout/MainLayout/Header/ProfileSection/ProfileMenu.jsx` (new)
-   `packages/ui/src/utils/profileUtils.js` (new)
