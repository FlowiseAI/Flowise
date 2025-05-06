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

## Billing Usage Events Table Enhancement - External Trace Link

### Changes

-   Added an external link icon to each row in the billing usage events table
-   The icon only appears when hovering over a row
-   Clicking the icon opens the Langfuse trace page in a new tab
-   Used Material-UI components (IconButton, Tooltip, OpenInNewIcon) for the implementation
-   Added a hover state with useState to track which row is being hovered
-   Added getLangfuseTraceUrl helper function to generate proper trace URLs

### Files Changed

-   `packages-answers/ui/src/billing/UsageEventsTable.tsx`: Added hover functionality and external link icon

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

# Flowise UI Updates

## SidekickSelect UI Update - 2023-10-19

### Latest Changes:

-   Added category filtering functionality to the grid view
-   When "See all" is clicked, users now see filter pills for all available categories
-   The current category is highlighted in the filter pills
-   Users can click on category pills to filter the grid view by that category
-   Empty state message appears when no sidekicks match the selected filter
-   Applied consistent styling to category filter pills with scrolling support
-   Added filter functionality to search results as well

### Previous Changes (2023-10-18):

-   Added dual-view layout functionality with smooth transitions
-   Clicking "See all" now switches from horizontal scroll to a grid layout for better browsing
-   Added subtle animations and transitions for a more polished user experience
-   Improved button interactions with hover effects and icon animations
-   Ensured consistent styling between both view modes

### Earlier Changes (2023-10-17):

-   Completely redesigned the SidekickSelect UI to use a Netflix-style horizontal scrolling layout
-   Removed the tab-based navigation in favor of category-based sections
-   Each category now displays as a separate section with horizontally scrollable cards
-   Maintained all existing functionality (search, favorites, clone, edit, etc.)
-   Fixed TypeScript formatting and linting issues
-   Optimized search functionality to display results in both horizontal scroll and grid formats
-   Added appropriate styling for scrollbars and improved visual feedback
-   Fixed card sizing for consistent appearance in both layouts

### Files Modified:

-   packages-answers/ui/src/SidekickSelect.tsx

### Technical Details:

-   Created CategoryFilter component with styled category pills
-   Added activeFilterCategory state to track selected filters for each category section
-   Enhanced the grid view to filter sidekicks based on selected category
-   Implemented filter functionality for search results with the same UI pattern
-   Added empty state messaging when no sidekicks match the selected filter
-   Used CSS transitions for smooth interactions
-   Maintained backward compatibility with existing functionality

### Next Steps:

-   Test UI responsiveness on different screen sizes
-   Update documentation with new screenshots

# Fixed-Height Card Layout Implementation

## Overview

Implemented a fixed-height card layout for the SidekickSelect component to ensure perfect visual consistency across all cards.

## Changes Made

-   Set a consistent fixed height (220px) for all SidekickCards
-   Created fixed-height areas for specific card sections:
    -   Header area: 68px height for title and tags
    -   Title: 2.4em height with 2-line clamp
    -   Description: 42px height with 2-line clamp
    -   Footer: 36px height for action buttons
-   Created a new StyledGridItem component to ensure all grid items maintain consistent heights
-   Applied consistent spacing between elements
-   Added text overflow handling to ensure title and description maintain fixed heights

## Files Modified

-   `/packages-answers/ui/src/SidekickSelect.tsx`

## Benefits

-   Perfect visual alignment across all cards regardless of content
-   Consistent two-line space for both titles and descriptions
-   Uniform appearance across different sections (search, categories, favorites)
-   Improved grid layout with identical heights for all cards
-   Better overall visual harmony in the UI

# UI Card Layout Refinements

## Overview

Refined the UI card layout in the SidekickSelect component to provide a more consistent and polished appearance.

## Changes Made

-   Removed fixed minimum height in favor of a more flexible layout approach
-   Made SidekickDescription component take a consistent height of 40px
-   Added flex layout to properly structure card content and push footer to bottom
-   Updated Grid items to use flexbox display for consistent card heights
-   Made card containers fill the entire width of their Grid cells
-   Added proper vertical spacing between card sections
-   Set description area to `flex: 1 0 auto` to maintain sizing

## Files Modified

-   `/packages-answers/ui/src/SidekickSelect.tsx`

## Benefits

-   All cards now have visually consistent heights without a fixed minimum height
-   Description areas maintain consistent dimensions regardless of content length
-   Footer buttons are consistently positioned at the bottom of each card
-   Improved visual hierarchy and spacing between card elements
-   More responsive layout that adjusts better to different content lengths
-   Enhanced overall UI consistency

# UI Layout Improvements for SidekickSelect

# Category Filtering Enhancement for Expanded Views

## Overview

Improved the category filtering behavior when using the "Show all" functionality to be consistent with search results.

## Changes Made

-   Modified the toggleViewMode function to automatically set the active filter to the selected category
-   Ensured proper filter reset when collapsing back to horizontal view
-   Streamlined the conditional rendering of filtered results across all views
-   Used consistent empty state messaging for when no results match a filter
-   Standardized the filtering UX between search results and expanded category views

## Files Modified

-   `/packages-answers/ui/src/SidekickSelect.tsx`

## Benefits

-   Consistent filtering behavior across all parts of the UI
-   When a user clicks "Show all" for a category, only items from that category are shown by default
-   Improved user experience with clearer feedback when filtering results
-   More predictable and intuitive UI behavior that matches user expectations
-   Better code organization with cleaner conditional rendering patterns

# Fixed-Height Card Layout Implementation

# Focused Category View Implementation

## Overview

Enhanced the SidekickSelect component with a focused view mode that displays only the selected category when users click "Show All".

## Changes Made

-   Added a new `focusedCategory` state to track which category is currently in focus
-   Created a dedicated `renderFocusedCategory` function that displays only sidekicks from the selected category
-   Modified the `toggleViewMode` function to set and clear the focused category state
-   Changed "Show All" behavior to hide all other categories and show only the selected one
-   Added a "Back to All" button to return to the normal view
-   Removed category filter pills from the focused view for a cleaner interface

## Files Modified

-   `/packages-answers/ui/src/SidekickSelect.tsx`

## Benefits

-   More intuitive "Show All" behavior that focuses solely on the selected category
-   Cleaner, more focused UI when exploring a specific category of sidekicks
-   Easier navigation with clear visual indication of being in a focused view
-   Improved user experience with less visual clutter when browsing a specific category
-   Clear path back to the main view with the "Back to All" button

# Category Filtering Enhancement for Expanded Views

# Search Results UI Enhancement

## Overview

Improved the search results UI to always display as an expanded grid layout without requiring user interaction.

## Changes Made

-   Removed the "See all" button from search results section
-   Eliminated the horizontal scrolling view for search results
-   Changed search results to always display in an expanded grid layout
-   Maintained category filtering functionality for search results
-   Removed unnecessary view switching logic for search results
-   Showed all search results without limiting the number displayed

## Files Modified

-   `/packages-answers/ui/src/SidekickSelect.tsx`

## Benefits

-   More immediate access to all search results without extra clicks
-   Consistent grid layout provides better visibility of all matching sidekicks
-   Improved user experience by showing all available results at once
-   Cleaner interface without unnecessary toggle buttons
-   Better overall search experience with fewer interactions required

# Focused Category View Implementation

## 2023-11-XX: Added `canEdit` permission for Sidekicks

### Changes:

-   Added a new `canEdit` boolean property to sidekicks that is true for both owners and admins
-   Updated the edit button display logic in SidekickSelect and AssistantInfoCard components
-   Added "Admin" chip to sidekicks that can be edited by admins but are not owned by the user
-   Backend now checks for admin role when determining if a user can edit a sidekick

This change allows admins to edit sidekicks they don't own, improving workflow for organization management.

## Empty Category Handling in SidekickSelect

### Changes:

-   Improved empty state handling in SidekickSelect component
-   Removed empty category sections entirely rather than showing empty state messages
-   Added a global empty state message that appears only when no sidekicks exist at all
-   Only display category sections that have content after loading completes
-   Kept skeleton loading for initial load to prevent layout shifts
-   Reset focused category automatically when it contains no items
-   Added direct link to create a new sidekick from the empty state message

This enhancement provides a cleaner UI by removing empty categories entirely and only showing relevant content to the user. Empty states are handled more gracefully with a single centralized message when appropriate.

## Skeleton Loading Cards for SidekickSelect

### Changes:

-   Added skeleton loading cards to the SidekickSelect component for improved user experience
-   Implemented a shimmer animation effect on skeleton cards using keyframes
-   Created SkeletonCard and SkeletonItem styled components for consistent styling
-   Used neutral gray tones for skeletons instead of colored styling for a more subtle appearance
-   Added loading state detection using the isLoading status from useSWR
-   Display skeleton cards in both horizontal scrolling and grid view layouts
-   Show skeleton cards when there are no categories or sidekicks available yet
-   Added proper empty state handling for categories with no sidekicks
-   Maintain consistent layout during loading for a smooth transition to loaded content
-   Fixed various linter errors including quote style consistency

This enhancement improves perceived performance by providing visual feedback while data is loading, and ensures a consistent user experience even when there's no content yet. The neutral-colored skeletons closely match the actual content's appearance for a smoother transition.

## 2023-11-XX: Added `canEdit` permission for Sidekicks

## Integrated Export/Import Functionality in AppDrawer

### Changes

-   Added Export/Import menu items to the user menu in AppDrawer
-   Placed the Export/Import functionality in the same menu as "Switch Organization" button
-   Used the existing ExportImportMenuItems component for consistency
-   Implemented proper integration with the menu close functionality
-   Maintained the same visual design and user experience

### Files Changed

-   `packages-answers/ui/src/AppDrawer.tsx`: Updated to include ExportImportMenuItems in the user menu

### Benefits

-   Improved discoverability of the Export/Import functionality
-   Consolidated user-related actions in a single menu
-   Maintained consistent design and behavior with existing UI patterns
-   Reused existing component instead of duplicating code
