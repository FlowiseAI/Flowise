# Token Optimization Guide for Auth0 Export Script

This guide helps you use the Auth0 export script efficiently with your 1000 token limit.

## 🔥 Ultra-Efficient Usage (Optimized Version)

The script has been optimized to use **minimal tokens**:

### ✅ Most Efficient Approach

```bash
# 1. First, estimate token usage (uses only 1-2 tokens)
node scripts/export-auth0-users.js --estimate-tokens

# 2. If estimation looks good, run the export
node scripts/export-auth0-users.js --verbose

# 3. If you need to limit users to stay under 1000 tokens
node scripts/export-auth0-users.js --max-users 500 --verbose
```

## 📊 Token Usage Breakdown

### Optimized Version (Current Script)

-   **1 token** - Get access token
-   **~1 token per 100 users** - Fetch users with roles included
-   **Total: ~10 tokens for 1000 users** ✅

### Old Inefficient Approach (Avoided)

-   1 token - Get access token
-   1 token per user for roles - **1000+ tokens for 1000 users** ❌

## 🚀 Key Optimizations Implemented

### 1. **Bulk Fetching with Roles**

```javascript
// ✅ EFFICIENT: Gets 100 users + their roles in 1 API call
fields: 'user_id,email,name,picture,created_at,updated_at,last_login,roles'
per_page: 100 // Maximum allowed
```

### 2. **Smart Pagination**

-   Uses maximum page size (100 users per request)
-   Includes roles in the same request (no separate calls)
-   Stops early if user limit is reached

### 3. **User Limiting**

```bash
# Limit to specific number of users to conserve tokens
--max-users 200   # Only export first 200 users
```

### 4. **Token Estimation**

```bash
# Check token usage before running (uses only 1-2 tokens)
--estimate-tokens
```

## 📈 Real-World Token Usage Examples

| Users  | Organizations | Estimated Tokens | Safe for 1000 limit? |
| ------ | ------------- | ---------------- | -------------------- |
| 50     | 1             | ~2 tokens        | ✅ Yes               |
| 500    | 1             | ~6 tokens        | ✅ Yes               |
| 1000   | 1             | ~11 tokens       | ✅ Yes               |
| 2000   | 1             | ~21 tokens       | ✅ Yes               |
| 10000  | 1             | ~101 tokens      | ✅ Yes               |
| 50000  | 1             | ~501 tokens      | ✅ Yes               |
| 100000 | 1             | ~1001 tokens     | ❌ Use --max-users   |

## 🛡️ Safety Commands

### For Large Organizations (>90,000 users)

```bash
# Step 1: Estimate first
node scripts/export-auth0-users.js --estimate-tokens

# Step 2: If estimate > 900 tokens, limit users
node scripts/export-auth0-users.js --max-users 9000 --verbose
```

### For Multiple Organizations

```bash
# Each org adds ~1-10 tokens depending on size
# Estimate first if you have multiple large orgs
node scripts/export-auth0-users.js --estimate-tokens
```

### Emergency: Conservative Export

```bash
# Guaranteed to use <10 tokens
node scripts/export-auth0-users.js --max-users 500 --verbose
```

## 🔍 Understanding the Estimation

When you run `--estimate-tokens`, the script:

1. **Makes 1 minimal API call per organization** to get user count
2. **Calculates pages needed** (users ÷ 100)
3. **Shows exact token estimate** before proceeding
4. **Warns if estimate exceeds 1000** tokens

Example output:

```
📊 Organization org_abc123:
   Users: 2,500
   Pages needed: 25
   Estimated tokens: 25

📋 TOTAL ESTIMATION:
   Total users: 2,500
   Total estimated tokens: 26
   Remaining from 1000: 974

✅ Export should fit within your token limit
```

## ⚡ Pro Tips for Maximum Efficiency

### 1. **Always Estimate First**

```bash
# This uses only 1-2 tokens and shows you exactly what to expect
node scripts/export-auth0-users.js --estimate-tokens
```

### 2. **Use Max Users for Large Orgs**

```bash
# If you have >90k users, limit the export
node scripts/export-auth0-users.js --max-users 8000
```

### 3. **Target Specific Organizations**

```bash
# Instead of all orgs, target just the one you need
node scripts/export-auth0-users.js --org org_specific123
```

### 4. **Monitor Your Usage**

-   The script shows real-time progress
-   Use `--verbose` to see exactly how many tokens are used
-   Each page fetch = 1 token

## 🚨 If You Hit the Token Limit

If you accidentally exceed 1000 tokens:

1. **Wait for reset** (Auth0 limits reset based on your plan)
2. **Use --max-users** for future exports
3. **Consider upgrading** your Auth0 plan for higher limits

## 🎯 Recommended Workflow

```bash
# 1. Quick check (2 tokens max)
node scripts/export-auth0-users.js --estimate-tokens

# 2. If estimate looks good, run full export
pnpm export-auth0-users --verbose

# 3. If estimate is too high, limit users
pnpm export-auth0-users --max-users 5000 --verbose
```

This optimized approach ensures you can export thousands of users while staying well under your 1000 token limit! 🎉
