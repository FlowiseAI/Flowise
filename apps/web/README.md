## Getting Started

First, run the development server:

```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `pages/index.js`. The page auto-updates as you edit the file.

[API routes](https://nextjs.org/docs/api-routes/introduction) can be accessed on [http://localhost:3000/api/hello](http://localhost:3000/api/hello). This endpoint can be edited in `pages/api/hello.js`.

The `pages/api` directory is mapped to `/api/*`. Files in this directory are treated as [API routes](https://nextjs.org/docs/api-routes/introduction) instead of React pages.

## Event Oriented with Inngest

This documentation provides information on how to use Inngest to process and synchronize events related to Jira and Slack integration.

### Overview

The project uses Inngest, a JavaScript-based open-source event-driven platform to automate the process of synchronizing Jira and Slack data. It allows us to create functions that are triggered in response to events and can be used to execute tasks based on the event's data.

### Main Event Types

The following are the available Inngest functions that can be triggered in response to specific events:

processSyncSlack: Process the slack/app.sync event
processJiraUpdated: Process the jira/app.sync event
processWebPageUpdated: Process the web/page.sync event
processWebDomainUpdated: Process the web/domain.sync event
processJiraUpdated: Process the jira/app.sync event
procesProjectUpdated: Process the PROJECT_UPDATED event
processUpsertedIssues: Process the jira/issues.upserted event

### Running the dev Inngest server

# The dev server is ran automatically when using turbo

# To run it manually, follow these steps:

1- Run the following command to start the dev server:

```bash
npx inngest-cli@latest dev -u http://localhost:3000/api/inngest
```

This will start the Inngest local server and will synchronize events on the specified URL.

Open the Inngest dashboard to see the available functions and events.

Sync any platform from the UI at http://localhost:3000

## Learn More

To learn more about Next.js, take a look at the following resources:

-   [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
-   [Learn Next.js](https://nextjs.org/learn/foundations/about-nextjs) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_source=github.com&utm_medium=referral&utm_campaign=turborepo-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.

```

```
