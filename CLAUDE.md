# @wolffm/hadoku-printtool

## What This Is

Image manipulation tool for print-ready output.
Three components: React UI library, CF Worker API, local ImageMagick server.

## Architecture

- `src/` — React UI library. Builds to `dist/index.js` + `dist/style.css`
  - Entry: `src/entry.tsx` exports `mount(el, props)` / `unmount(el)`
  - Domain logic in `src/domain/`, UI in `src/components/`
- `worker/` — CF Worker API handler. Builds to `dist/worker.js`
  - Entry: `worker/src/index.ts` exports `createPrinttoolHandler(basePath)`
  - OpenAPI schemas in `worker/src/schemas.ts`
- `server/` — Local-only Node server (NOT published). ImageMagick + Python pipelines.
  - Runs via PM2: `pnpm local:start`
  - Receives requests via Cloudflare Tunnel managed by hadoku-site
  - `server/python/sticker/` — Python sidecar (sticker pipeline), spawned per request
  - `server/pyproject.toml` — Python deps (Hatchling), installed into `server/.venv/`

## Python sidecar deps

Per the hadoku ecosystem convention (`personal-dataplatform/server/CLAUDE.md`):
**per-repo `.venv`**, never global. The Node server resolves the interpreter at
`server/.venv/Scripts/python.exe` (Windows) or `server/.venv/bin/python`. One-time
setup:

```bash
cd server
python -m venv .venv
.venv/Scripts/pip install -e .
```

## Contracts

This repo publishes `@wolffm/hadoku-printtool` to GitHub Packages.

- Default export: UI library with `mount(el)` / `unmount(el)` (from `src/entry.tsx`)
- `./api` subpath: CF Worker handler factory (from `worker/src/index.ts`)
- `./style.css` subpath: compiled CSS
- On publish: dispatches `packages_updated` to WolffM/hadoku_site

Peer dependencies (provided by parent): react, react-dom, @wolffm/themes, @wolffm/task-ui-components

## Build

- `pnpm build` — runs three steps: vite build (UI), vite build (worker), tsc (declarations)
- `pnpm dev` — starts PM2 local server + vite dev server with proxy to localhost:8787
- `pnpm test` — runs vitest (happy-dom env, canvas is mocked via `src/test-utils/canvasMock.ts`, pica is mocked per-file)

## Does NOT

- Manage Cloudflare Tunnel config (see ../hadoku_site/)
- Publish the local server — it's dev-only
- Have tests (no test framework configured)
- Use console.log — use `logger` from `@wolffm/task-ui-components` instead

## External Dependencies

- Parent site: `../hadoku_site/` (GitHub: WolffM/hadoku_site)
- Production URL: hadoku.me/printtool/api
- Tunnel: managed by hadoku-site cloudflared config

## Versioning

Pre-commit hook auto-bumps patch version on every commit.
Patch rolls over at .20 → bumps minor. CI also bumps if version already published.
