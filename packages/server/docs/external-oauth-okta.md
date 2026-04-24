# External OAuth (Snowflake-style) with Okta

Flowise can act as an **OAuth 2.0 resource server**: users obtain **access tokens** from your external OpenID Connect provider (for example **Okta**) and call Flowise HTTP APIs with:

```http
Authorization: Bearer <access_token>
```

This follows the same integration pattern as [Snowflake External OAuth with Okta](https://docs.snowflake.com/en/user-guide/oauth-okta): Flowise trusts your authorization server and maps **scopes** (and optional custom claims) to Flowise **RBAC permission strings** (for example `chatflows:view`).

## Prerequisites

-   Flowise **Enterprise/Org** with organization and at least one workspace.
-   Administrator access to assign the **`externalOAuth:manage`** permission (API key or role) so you can create integrations via `POST /api/v1/external-oauth-integrations`.

## Okta configuration (summary)

1. Create an **OAuth 2.0** app (Web or SPA) using **Authorization Code with PKCE** for user-facing clients.
2. Use a **Custom Authorization Server** (for example `default` or a dedicated server). Note the **Issuer URI**, for example:
    - `https://dev-XXXXX.okta.com/oauth2/default`
3. Define an **API Audience** (resource identifier) that access tokens will use — for example `https://flowise.yourcompany.internal/api`. The token `aud` claim must match one of the **audiences** stored in the Flowise integration.
4. Create **custom scopes** that you will map in Flowise (for example `flowise.chatflows.read`) or use a custom claim (see below).

## Register an integration in Flowise

`POST /api/v1/external-oauth-integrations` with session auth (`x-request-from: internal` + cookie) or a **Flowise API key** that includes `externalOAuth:manage`.

Example body:

```json
{
    "name": "Corp Okta",
    "issuerUrl": "https://dev-XXXXX.okta.com/oauth2/default",
    "audiences": ["https://flowise.yourcompany.internal/api"],
    "workspaceId": "<your-workspace-uuid>",
    "permissionScopeMap": {
        "flowise.chatflows.read": ["chatflows:view", "chatflows:update"],
        "flowise.tools.read": ["tools:view"]
    },
    "allowedClientIds": [],
    "customPermissionsClaimName": "flowise_permissions",
    "enabled": true
}
```

-   **issuerUrl** must exactly match the `iss` claim in access tokens.
-   **audiences** must match token `aud` (Okta typically emits a single audience for API access tokens issued for that audience).
-   **permissionScopeMap** maps each IdP **scope name** to an array of Flowise permission strings (same values as in the “Edit API Key” UI).
-   **customPermissionsClaimName** (optional): name of a JWT claim whose value is a JSON **array of permission strings**, merged with scope mapping. Default when omitted: `flowise_permissions`.
-   **allowedClientIds** (optional): if non-empty, Flowise validates OAuth client id from `azp` / `cid` / `client_id`.

## Calling Flowise APIs

1. Perform the OAuth **authorization code + PKCE** flow with Okta and request scopes that you mapped in `permissionScopeMap`.
2. Send the **access token** (JWT) to Flowise:

```bash
curl -sS -H "Authorization: Bearer $ACCESS_TOKEN" \
  https://<flowise-host>/api/v1/chatflows
```

3. **Legacy API keys** still work: `Authorization: Bearer <flowise_api_secret>` where the secret is not JWT-shaped.

## Troubleshooting

| Symptom                                               | What to check                                                                                                                                                                                                                                                                                                                                                                                              |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Okta **invalid_scope** (“scopes are not configured…”) | Every string in the authorize **`scope`** list must exist on that **Custom Authorization Server** (Security → API → _your server_ → **Scopes**). Do **not** pass the resource **audience** (for example `api://flowise`) as a scope unless you created a scope with that exact name. Use OIDC defaults (`openid profile email`) plus **custom scopes** you defined (for example `flowise.chatflows.read`). |
| `401 Unauthorized`                                    | Issuer URL mismatch with token `iss`; integration disabled; clock skew; invalid signature.                                                                                                                                                                                                                                                                                                                 |
| Audience errors                                       | Token `aud` must match one configured **audiences** entry exactly.                                                                                                                                                                                                                                                                                                                                         |
| `403 Forbidden` on routes                             | IdP scopes/claims did not map to a permission required by that route; expand `permissionScopeMap` or custom claim.                                                                                                                                                                                                                                                                                         |
| OIDC discovery failure                                | Flowise must reach `https://<issuer>/.well-known/openid-configuration` (network / TLS / Zscaler CA).                                                                                                                                                                                                                                                                                                       |

Do **not** paste real tokens into logs or tickets.

## API surface

| Method | Path                                      | Description                       |
| ------ | ----------------------------------------- | --------------------------------- |
| GET    | `/api/v1/external-oauth-integrations`     | List integrations for current org |
| GET    | `/api/v1/external-oauth-integrations/:id` | Get one                           |
| POST   | `/api/v1/external-oauth-integrations`     | Create                            |
| PUT    | `/api/v1/external-oauth-integrations/:id` | Update                            |
| DELETE | `/api/v1/external-oauth-integrations/:id` | Delete                            |

All require **`externalOAuth:manage`**.
