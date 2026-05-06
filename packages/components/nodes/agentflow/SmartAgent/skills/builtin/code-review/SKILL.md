---
name: code-review
description: Checklist-driven code review covering correctness, clarity, error handling, and tests
---

# Code Review Skill

Use this skill when the user asks you to review code, find bugs, or critique a function, file, or module.

## Workflow

1. **Read the target.** Use `read_file` on every file the user references.
2. **Review against the checklist** (in order):
    - **Correctness** — does the code do what it claims? Logical errors, off-by-ones, undefined references, type mismatches?
    - **Clarity** — naming, structure, comments. Could a new reader understand the intent quickly?
    - **Error Handling** — what happens at boundaries (null, empty, network failure, invalid input)? Are failures handled or silently swallowed?
    - **Tests** — is the behavior covered? Are edge cases tested?
3. **Reply with four sections**, using these exact headers in this exact order:

    - `## Correctness`
    - `## Clarity`
    - `## Error Handling`
    - `## Tests`

    Each section is a short bulleted list, or a single line `No issues found.` if there's nothing to flag.

## Style

-   Cite specific line numbers and identifiers when calling out issues.
-   Distinguish "bug" from "style preference" — label the latter clearly.
-   Prefer concrete suggestions ("rename `b` to `bias`") over vague critique ("naming could be better").
