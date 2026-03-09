Here’s the **Flowise tech stack** from the repo:

---

## Backend (`packages/server`)

| Layer            | Tech                                                                                          |
| ---------------- | --------------------------------------------------------------------------------------------- |
| **Runtime**      | Node.js (≥18.15.0, &lt;19 or ^20)                                                             |
| **Language**     | TypeScript                                                                                    |
| **Framework**    | Express                                                                                       |
| **CLI**          | oclif                                                                                         |
| **ORM / DB**     | TypeORM                                                                                       |
| **Databases**    | SQLite (sqlite3), PostgreSQL (pg), MySQL (mysql2)                                             |
| **Sessions**     | express-session with connect-sqlite3, connect-pg-simple, connect-redis, express-mysql-session |
| **Auth**         | Passport (JWT, local, Auth0, GitHub, Google OAuth2, OpenID Connect, cookie)                   |
| **Queue / jobs** | BullMQ, Bull Board                                                                            |
| **Caching**      | cache-manager, Redis (@keyv/redis, rate-limit-redis)                                          |
| **File upload**  | Multer (S3, Azure Blob, GCS via multer-s3, multer-azure-blob-storage, multer-cloud-storage)   |
| **Other**        | LangChain/OpenAI, Winston logging, OpenTelemetry, Stripe, nodemailer, Handlebars              |

---

## Frontend (`packages/ui`)

| Layer             | Tech                                                                                          |
| ----------------- | --------------------------------------------------------------------------------------------- |
| **Build**         | Vite                                                                                          |
| **Language**      | JavaScript (JSX), some TypeScript                                                             |
| **UI framework**  | React 18                                                                                      |
| **Routing**       | React Router 6                                                                                |
| **State**         | Redux (@reduxjs/toolkit, react-redux)                                                         |
| **UI library**    | Material UI (MUI) v5 (@mui/material, @mui/icons-material, @mui/x-data-grid, @mui/x-tree-view) |
| **Styling**       | Emotion (@emotion/react, @emotion/styled), SASS                                               |
| **Flow editor**   | React Flow                                                                                    |
| **Editor / code** | CodeMirror 6 (@uiw/react-codemirror), TipTap                                                  |
| **Charts**        | Recharts                                                                                      |
| **Forms**         | Formik, Yup                                                                                   |
| **HTTP**          | Axios                                                                                         |
| **Other**         | Framer Motion, react-markdown, DOMPurify, PWA (vite-plugin-pwa)                               |

---

## Monorepo / tooling

-   **Package manager**: pnpm (workspaces)
-   **Build / tasks**: Turbo
-   **Linting / format**: ESLint, Prettier
-   **Version control hooks**: Husky, lint-staged

So: **backend = Node + TypeScript + Express + TypeORM + Passport + BullMQ**, **frontend = React + Vite + MUI + Redux + React Flow**.
