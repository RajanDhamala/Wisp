# Wisp

Wisp is an AI app builder for turning a conversation into a working web
interface. It streams the answer as it is generated, keeps chat history in
PostgreSQL, and turns named React, TypeScript, CSS, JavaScript, or HTML blocks
into a runnable preview. Users can choose the model for each request and attach
small text or code files as temporary context; file contents are not stored.

Generated files are assembled into an isolated browser project. Wisp detects
the entry file, connects multi-file imports, loads declared dependencies, and
shows build or runtime errors inside the preview. Shell commands are displayed
in copyable terminal blocks and are never executed automatically. If the page
is refreshed during generation, the API continues the work and the frontend
loads the saved response when the user returns.

## Stack

- React 19, TypeScript, Vite, Tailwind CSS, and TanStack Query
- Sandpack for isolated code execution and previews
- Node.js and Express for the API and streamed responses
- Prisma with PostgreSQL for users, sessions, messages, and token usage
- JWT authentication stored in HTTP-only cookies
- An OpenAI-compatible streaming model provider

## Run locally

You need Node.js 20+, pnpm, and a running PostgreSQL database.

Start the API:

```bash
cd app/api
pnpm install
pnpm exec prisma generate
pnpm exec prisma db push
pnpm dev
```

Start the frontend in another terminal:

```bash
cd app/web
pnpm install
pnpm dev
```

## Updating the models

The available models and the fallback model live in one place:
`app/api/src/Config/Models.js`. To add, rename, or remove a model, update that
catalog and restart the API. The frontend reads the catalog from
`GET /api/session/models`, so there is no database migration and no frontend
rebuild for a model-list change.
