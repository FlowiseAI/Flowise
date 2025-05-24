# Dependabot Batch Processing Playbook 📋

## Overview

This playbook provides step-by-step instructions for efficiently processing multiple Dependabot PRs in batch, based on a successful 16/16 (100%) completion rate experience.

## Prerequisites

-   Repository uses `pnpm` package manager
-   Repository has `turbo` build system
-   Repository has a working `pnpm build` command
-   Git access to create branches and merge PRs

## 🎯 Strategy

### Risk-Based Processing Order

1. **GitHub Actions updates** (safest, rarely break builds)
2. **Minor NPM updates** (usually safe, semantic versioning)
3. **Major NPM updates** (test individually, higher breaking change risk)
4. **Type definition updates** (extremely safe, usually non-breaking)

### Testing Methodology

-   **Quick test**: `pnpm install && pnpm build`
-   **Success criteria**: Clean install + successful build
-   **Failure handling**: Revert and document for individual review

## 📝 Step-by-Step Process

### Step 1: Initial Assessment

```bash
# Navigate to repository
cd /path/to/repository

# Check current branch status
git status

# List all available Dependabot branches
git branch -r | grep dependabot

# Count total PRs to process
git branch -r | grep dependabot | wc -l
```

**Create tracking files:**

-   `dependabot-progress.md` - Track completion status
-   `dependabot-strategy.md` - Document approach (optional)

### Step 2: Create Consolidated Branch

```bash
# Ensure you're on main/master
git checkout main
git pull origin main

# Create new branch for batch processing
git checkout -b chore/dependabot-YYYYMMDD
```

### Step 3: Process GitHub Actions Updates First

```bash
# List GitHub Actions Dependabot branches
git branch -r | grep dependabot | grep github_actions

# For each GitHub Actions update:
git checkout remotes/origin/dependabot/github_actions/[branch-name] -- [workflow-file-path]
pnpm install
pnpm build

# If successful:
git add .
git commit -m "chore: update [package-name] to [version]"

# If failed:
git checkout -- .
# Document failure and continue
```

### Step 4: Process Minor NPM Updates

```bash
# List NPM/Yarn Dependabot branches
git branch -r | grep dependabot | grep npm_and_yarn

# For each minor update (check version numbers):
git checkout remotes/origin/dependabot/npm_and_yarn/[branch-name] -- packages/*/package.json
pnpm install
pnpm build

# If successful:
git add .
git commit -m "chore: update [package-name] to [version]"

# If failed:
git checkout -- .
# Document for individual review
```

### Step 5: Process Major NPM Updates

```bash
# For each major update (breaking version changes):
git checkout remotes/origin/dependabot/npm_and_yarn/[branch-name] -- packages/*/package.json
pnpm install

# Check for compilation errors first
pnpm build

# If successful:
git add .
git commit -m "chore: update [package-name] to [version]"

# If failed:
git checkout -- .
# Mark for individual review with details
```

### Step 6: Process Type Definition Updates

```bash
# These are typically safe (e.g., @types/*)
# Process using the same pattern as minor updates
```

## 🔧 Decision Tree

### When Install Fails

```bash
# Check for peer dependency warnings (usually safe to ignore)
# Check for actual installation errors
# If real errors:
git checkout -- .
# Document the failure
# Continue with next update
```

### When Build Fails

```bash
# Check TypeScript compilation errors
# Check for breaking API changes
# If fixable quickly:
# - Fix and test
# If complex:
git checkout -- .
# Mark for individual expert review
```

### When Lockfile Conflicts Occur

```bash
# Cherry-pick only package.json changes
git checkout remotes/origin/[branch] -- package.json
pnpm install  # This regenerates lockfile
pnpm build
```

## 📊 Progress Tracking Template

```markdown
## Progress: X/Y ✅ (Z% Complete!)

### ✅ COMPLETED (X)

1. ✅ package-name-version (type) - PASSED
2. ✅ package-name-version (type) - PASSED

### ❌ FAILED (X)

1. ❌ package-name-version (type) - FAILED: [reason]

### 🔄 REMAINING (X)

-   package-name-version (type)

### Success Rates by Type

-   GitHub Actions: X/Y (Z%)
-   Minor NPM: X/Y (Z%)
-   Major NPM: X/Y (Z%)
```

## 🚀 Final Steps

### Step 1: Push Consolidated Branch

```bash
git push origin chore/dependabot-YYYYMMDD
```

### Step 2: Create Consolidated PR

-   **Title**: `chore: batch update X dependabot dependencies`
-   **Description**: Include success rate, testing methodology, and any failures
-   **Include**: Link to progress tracking file

### Step 3: Clean Up Individual PRs

After consolidated PR is merged:

1. **Let GitHub auto-close** redundant PRs (preferred)
2. **Manually close** any remaining with note: "Incorporated into consolidated PR #X"

### Step 4: Handle Failures

For any failed updates:

1. Create individual PRs for complex updates
2. Research breaking changes
3. Update code if necessary
4. Test individually with more thorough testing

## 🎯 Success Patterns Observed

### Extremely Safe (Near 100% success rate)

-   GitHub Actions version updates
-   TypeScript type definitions (@types/\*)
-   CLI framework minor updates (@oclif/\*)

### Very Safe (High success rate)

-   Minor semantic version updates
-   Well-maintained library minor updates
-   LangChain ecosystem updates

### Moderate Risk (Test carefully)

-   Major version updates (breaking changes possible)
-   Core dependency updates
-   Build tool updates

## ⚠️ Red Flags to Watch For

### Skip Batch Processing If:

-   Package has major API changes mentioned in changelog
-   Package is a core framework dependency
-   Previous updates from same package have failed
-   Package is deprecated or has security warnings

### Warning Signs During Processing:

-   Multiple peer dependency errors
-   TypeScript compilation errors
-   Build process hanging or crashing
-   New runtime warnings in build output

## 🧪 Commands Reference

### Essential Commands

```bash
# Quick status check
git status

# Cherry-pick specific files
git checkout remotes/origin/[branch] -- [file-path]

# Test sequence
pnpm install && pnpm build

# Commit successful update
git add . && git commit -m "chore: update [package] to [version]"

# Revert failed update
git checkout -- .

# Count remaining branches
git branch -r | grep dependabot | wc -l
```

### Debugging Commands

```bash
# Check package changes
git diff HEAD~1 package.json

# See what was installed
pnpm list [package-name]

# Check build logs for specific errors
pnpm build 2>&1 | grep -i error
```

## 📈 Expected Outcomes

Based on historical data:

-   **GitHub Actions**: ~100% success rate
-   **Minor NPM updates**: ~90-95% success rate
-   **Major NPM updates**: ~70-85% success rate
-   **Type definitions**: ~100% success rate

**Overall expected success rate: 85-95%**

## 🎉 Success Metrics

A successful batch processing session should achieve:

-   ✅ 80%+ updates processed successfully
-   ✅ Zero breaking changes merged
-   ✅ Clean, documented commit history
-   ✅ Clear tracking of failures for follow-up
-   ✅ Reduced individual PR management overhead

---

## 📝 Template for Agent Instructions

When using this playbook, create a session log:

```markdown
# Dependabot Batch Processing Session - [DATE]

## Session Goals

-   Process X Dependabot PRs
-   Target: Y% success rate
-   Focus areas: [GitHub Actions, Minor NPM, etc.]

## Session Results

-   Processed: X/Y updates
-   Success rate: Z%
-   Failed updates: [list with reasons]
-   Time saved vs individual processing: ~X hours

## Next Actions

-   [List any follow-up items]
```

This playbook should enable any agent to efficiently process Dependabot PRs with confidence and systematic approach! 🚀
