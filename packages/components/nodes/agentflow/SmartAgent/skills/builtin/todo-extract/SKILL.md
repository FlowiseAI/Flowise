---
name: todo-extract
description: Scan files for TODO/FIXME/HACK/XXX markers and write a structured report to /artifacts/todos.md
---

# Todo Extract Skill

Use this skill when the user asks you to find, list, or extract TODO/FIXME/HACK/XXX markers from a file or directory.

## Workflow

1. **Determine the scope.** If the user names a file, scope to that file. If they name a directory, scope to that directory. If they name nothing, scope to `/workspace/`.
2. **Grep for markers.** Use `grep` with the pattern `TODO|FIXME|HACK|XXX` over the scope. Capture path, line number, and matched line content for every hit.
3. **Write the report** to `/artifacts/todos.md` using `write_file`. Format:

    ```
    # Todos

    ## <relative-path>
    - L<line>: <verbatim-content>
    ```

    One section per file. List matches in line-number order. If zero matches across the entire scope, write `No TODO/FIXME/HACK/XXX markers found.` as the file body.

4. **Reply with one line:** `Found N todo markers across M files. Report at /artifacts/todos.md.` (Use the actual N and M; use `No markers found.` when N is zero.)

## Style

-   One line per match. Don't paraphrase the content — copy the matched line verbatim.
-   Don't include matches that appear inside fenced code blocks of your own scratch notes — only matches found by `grep` against the scope.
