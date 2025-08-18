# SEO Optimization Checklist for Docusaurus (packages/docs)

This checklist outlines recommended SEO improvements for the docs/marketing site, with concrete suggestions and examples.

## Canonical/Domain

-   Set primary site URL in `docusaurus.config.ts` to `https://answeragent.ai`.
-   Keep docs under `/docs` (or move to root if you prefer). Avoid subdomain for docs.

## Sitemap & Robots

-   Ensure sitemap is enabled and excludes noise (e.g., `/tags/**`).
-   Robots.txt example:

```
User-agent: *
Allow: /
Sitemap: https://answeragent.ai/sitemap.xml
```

## Metadata & Social Cards

-   Global metadata in `docusaurus.config.ts` (description, keywords, social image).
-   Per-page frontmatter override:

```
---
id: getting-started
title: Getting Started with AnswerAgent
description: Launch AI agents, chat, and workflows in minutes with AnswerAgent.
keywords: [AnswerAgent, AI agents, AI chatbot, RAG, embeddings, vector search]
---
```

## Headings & Content Structure

-   One H1 per page; descriptive H2/H3s; scannable intros and lists.

## Internal Linking

-   Link related guides, API refs, and use-cases.
-   Add “Next steps” sections; use absolute paths (`/docs/...`).

## URL Hygiene

-   Concise hyphenated slugs; avoid dates for evergreen docs.

## OpenAPI/API Pages

-   Server URLs should point to `https://prod.studio.theanswer.ai/api/v1`.
-   Provide real curl/JS examples; task-oriented intros per API group.

## Images & Media

-   Descriptive `alt` text; prefer local `static/img/` assets; compress images.

## Performance

-   Optimize media; limit heavy iframes; split very long pages.

## Structured Data (Optional)

-   Add JSON-LD with `@docusaurus/Head` when helpful (articles/tutorials).

## Blog

-   Unique title/description/slug; use canonicals if duplicating elsewhere.

## Broken Links & 404s

-   Enforce link checks in CI; periodically crawl built site.

## Internationalization (Future)

-   Add `hreflang` and localized sitemaps if enabling locales.

## Tracking & Privacy

-   Verify analytics; anonymize IP; avoid injecting query params internally.

## Migration To-Dos in this repo

-   Ensure CTAs point to `https://studio.theanswer.ai`.
-   Ensure OpenAPI YAML `servers` use `https://prod.studio.theanswer.ai/api/v1`.
-   Set static API spec host default to `prod.studio.theanswer.ai`.

## Page Review Template

-   H1 reflects intent and includes primary keyword
-   Meta description (<=160 chars) concise and unique
-   Keywords (5–12) relevant and not stuffed
-   Clear structure with internal links
-   Images with alt text; social card renders
-   Code blocks correct and tested
-   Page answers both “why” and “how”
