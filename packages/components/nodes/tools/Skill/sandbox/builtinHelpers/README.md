# Built-in Sandbox Helpers

Stdlib-only Python scripts that ship with the Flowise runtime and get
materialised into every Skill sandbox VM under
`/home/user/helpers/`. They give the LLM a predictable, image-independent
way to handle common file formats (PDF, DOCX, XLSX, PPTX, HTML) without
the skill author having to ship their own extractor in every workspace.

This is a runtime concern — there is **no UX surface** in the Skill
workspace editor today. Authors discover the helpers through:

1. The "Built-in helpers" block injected into the `bash_<SkillName>`
   tool's description (see `SandboxBashTool.ts`).
2. The per-family alternatives in `commandRecipes.ts` (e.g. `binary-pdf`
   primary now points at `pdf_extract.py`, with `pdftotext` demoted to
   an alternative).
3. This document.

---

## Available helpers

| Script            | Handles         | Invocation                                                          | Failure escalation                                     |
| ----------------- | --------------- | ------------------------------------------------------------------- | ------------------------------------------------------ |
| `pdf_extract.py`  | `.pdf`          | `python3 /home/user/helpers/pdf_extract.py <path>`                  | `pdftotext`, `pdfgrep`, `pdfinfo`                      |
| `docx_extract.py` | `.docx`         | `python3 /home/user/helpers/docx_extract.py <path>`                 | `pandoc`, `unzip -p {file} word/document.xml`          |
| `xlsx_extract.py` | `.xlsx`         | `python3 /home/user/helpers/xlsx_extract.py <path> [<sheet_index>]` | `xlsx2csv`, `unzip -p {file} xl/sharedStrings.xml`     |
| `pptx_extract.py` | `.pptx`         | `python3 /home/user/helpers/pptx_extract.py <path>`                 | `python-pptx`, `unzip -p {file} ppt/slides/slide1.xml` |
| `html_to_text.py` | `.html`, `.htm` | `python3 /home/user/helpers/html_to_text.py <path>`                 | `lynx -dump`, `pandoc -f html -t plain`                |

---

## Contract

Every helper follows the same exit-code shape — the bash tool envelope
and the LLM's escalation logic both depend on it:

| Exit code | Meaning                                                              |
| --------- | -------------------------------------------------------------------- |
| `0`       | Success. Useful text written to stdout.                              |
| `1`       | Parser failure (file unreadable, unsupported variant, empty result). |
| `2`       | Bad usage (wrong number of args, etc).                               |

Stderr carries a short human-readable error line so the LLM can pick
the next alternative without further round-trips.

---

## Adding a new helper

1. Drop a stdlib-only `<name>.py` into `./scripts/` following the exit-code
   contract above. **No external pip dependencies** — the helper has to
   work on a stock E2B image.
2. Append a `makeHelper({ ... })` entry to the registry in `./index.ts`.
3. Wire the extension(s) into `../commandRecipes.ts` so the bash recipe
   routes to your helper when `helpersAvailable` is true. Keep the
   native binary (e.g. `unzip`, `pdftotext`) as an `alternative` so the
   LLM has an escape hatch.
4. Add a fixture under `./__fixtures__/` and a contract test in
   `./contracts.test.ts` that runs the script via `child_process.spawnSync`
   and asserts on the captured stdout.
5. Update the table above and the "Built-in Helpers" section in
   `docs/skill-v2/SANDBOX_INTEGRATION.md`.

---

## Opt-out

Set `SKILL_BUILTIN_HELPERS=false` (or `0` / `off` / `no`) to skip
materialisation entirely. Recipes will then fall back to the native
commands they were built around (`pdftotext`, `unzip`, …) — useful when
running against a custom E2B image that already ships those binaries
and you want to verify the recipe demotion works.

---

## Footprint

Helpers are **exempt** from `SKILL_V2_SANDBOX_MAX_BYTES_PER_FILE` and
`SKILL_V2_SANDBOX_MAX_TOTAL_BYTES` — they are first-party trusted code,
not user-uploaded assets. They are still accounted for in a single
per-session log line:

```
[SandboxSession] Materialized N helpers (B bytes) for skill <id>
```

so that accidental size growth (e.g. someone shipping a 200 KB Python
helper) is visible without bisecting commits.
