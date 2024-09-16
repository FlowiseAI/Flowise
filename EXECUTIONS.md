## Env vars

-   `PUBLIC_ORG_ID` - The auth0 org id for the public org
-   `TRIAL_PLAN_EXECUTIONS` - The number of executions available for the trial plan

## Trial plans

If the user is in the public org, the system will check to see if they have a trial plan when they first execute a chatflow (or go into the admin tab to check their plans). If one does not exist a new one will be created with the number of executions specified by the `TRIAL_PLAN_EXECUTIONS` env var.

No additional work from last rev is needed for this to work.

## Paid plans

Paid plans are in a different table. They are tied to the org, not the user, and are checked when the org is not the public org as specified by the `PUBLIC_ORG_ID` env var.

In order to insert a paid plan into the table, the following sql statements must be executed:

```sql
-- example, to create a paid plan where $12,000 was paid for 100,000 executions, of which 2000 were already used
INSERT INTO "paid_plan" ("id", "organizationId", "amount", "currency", "availableExecutions", "usedExecutions")
    VALUES (gen_random_uuid(), '{orgId}', 12000, 'USD', 100000, 2000);
UPDATE "organization" SET "currentPaidPlanId" = '{paidPlanId that was just created}' WHERE "id" = '{orgId}';
```

## Checking chatflows for available excutions

When a chatflow (or agentflow) is executed, we check the chatflow.userId and chatflow.organizationId to determine if the chatflow owner is in the public org or not. If they are, we check the trial plan for available executions. If they are not in the public org, we check the paid plan for available executions.

For the trial plan, once it has used a number equal to the available executions, the user will not be able to use any more chatflows.

For the paid plan, once it has used a number equal to the available executions, the system will check for other paid plans that have been created for the org, with a later create date than the current one. If one is found, and it has available executions, the system will set that paid plan as the current paid plan for the org. If one is not found, the user will not be able to execute any more chatflows.

## Admin sidebar item

The admin sidebar item is only visible to users with "Builder" permissions. On this page, the first tab shows the current plan, whether paid or free, or will say no plan, if the user is not in the public org and no paid plan exists. The second tab shows plan history. For trial plans this will only ever contain the one current plan, for paid plans, it contains all plans that the org has purchased.
