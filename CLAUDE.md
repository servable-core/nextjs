# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

For fast copy-paste usage, see `QUICKREF.md`. `README.md` is currently just a license stub — treat this file and `QUICKREF.md` as the real documentation until that changes.

## What this repo is

`@servable/nextjs` — the browser-facing React/Next.js client for a Servable app. Talks to a Servable server's public HTTP route layer (`/v1/...`) over axios, never sees the app's master key. This is the counterpart to `@servable/agent` (`lib/servable/clients/js`), which is the trusted, direct-to-database client for backend services — don't confuse the two or blend their patterns; this package must stay safe to run in a browser.

## Commands

- Install: `yarn install`
- Test: `yarn test` (jest, no `--config` flag needed — auto-discovers `jest.config.js`; unlike `server`/`agent`/the engine, this is not a combined `test:unit`+`test:lint`+`test:build` chain, just the test suite)
- Lint: `yarn test:lint` (`eslint .`)
- Build: `yarn build` (microbundle → `dist/`)
- Publish (after review): `yarn acp`, CI runs `semantic-release` on `main`

## Testing gotcha

Runs native ESM under `--experimental-vm-modules`, no Babel transform. `jest`/`describe`/`test`/`expect` need `import { jest } from "@jest/globals"` where used. `jest.mock()` doesn't work here (no hoisting) — use `jest.unstable_mockModule()` + dynamic `import()` instead (see `src/routes/lib/requestRoute.test.js`). Tests also need `testEnvironment: "jest-environment-jsdom"` (already set in `jest.config.js`) since `src/routes/lib/buildRouteUrl.js` reads `window`.

## Architecture

Four public namespaces, assembled in `src/index.js` and re-exported as the package default export (consumed as `import Servable from "@servable/nextjs"` — see `web/main/pages/_app.js` for the real usage pattern):

- **`Routes`** (`src/routes/`) — `Get`/`Post`/`Patch`/`Put`/`Delete`/`Function`, one file per HTTP verb. All of them delegate to `src/routes/lib/requestRoute.js`, which is the actual implementation: builds the request (`buildRouteUrl.js` resolves the backend URL from env/runtime/window, `headers.js` reads the session-token and installation-id cookies, `device.js` attaches locale/timezone/UTM params, `trace.js` propagates W3C traceparent/baggage from Sentry's current scope), runs it through `retry.js` (exponential backoff, `Retry-After`-aware, method-aware defaults — GETs retry, POSTs don't by default), and normalizes errors (`normalizeRouteError.js`). `Get` additionally layers response caching (`get/buildCacheKey.js`, `readCache.js`, `writeCache.js`) in front of `requestRoute`.
- **`hooks`** (`src/hooks/`) — `useServableFunction` (calls `Function` or `Get` depending on `httpMethod`, with cache-policy support: `cache-only`/`cache-first`/`network-only`) and `useServableRouteGet` (thin `Get` wrapper). Both re-run on `routeName`/`params`/`httpMethod` changes (via a `requestSignature` memo), not just on mount.
- **`User`** (`src/user/`) — `current`/`currentAsync`/`saveCurrentLocally`, session/current-user helpers built on `store`.
- **`store`** (`src/store/`) — `getStoreValue`/`setStoreValue`, a cookie-backed key/value store (via `cookies-next`) that works in both server (Next.js `context`/`req`/`res`) and client contexts.

## The `lib/account/lib/openaccountredirect` contract

`requestRoute.js` imports `openAccountRedirect` from the bare specifier `lib/account/lib/openaccountredirect` — not a real npm package, a convention: every consuming Next.js app is expected to provide this module at that path (resolved via the app's own `baseUrl`-relative import config), called when the backend returns HTTP 209 (invalid/expired session) on a route invoked with `redirectIfUserRequired: true`. This package's own tests can't rely on a consuming app's aliasing, so `jest.config.js` sets `modulePaths: ["<rootDir>"]` and a real stub lives at `lib/account/lib/openaccountredirect.js` (package root, not `src/`) purely so tests can resolve and mock it — it's not shipped (see `files` in `package.json`). Don't "fix" that stub into real logic; it exists only to satisfy module resolution in this package's own test run.

## Keeping this package in sync with `web/main`

`web/main` vendors its own local copy at `web/main/@servable/nextjs/` and has historically drifted ahead of this published package (real fixes made locally, never ported back). If you're asked to sync again, diff `web/main/@servable/nextjs/` against `src/` file-by-file before porting anything — check for `web/main`-specific hardcoded paths or business logic that shouldn't ship in a general-purpose package (the `openaccountredirect` bare-specifier pattern above turned out to be a pre-existing, intentional convention, not a hack, but that was worth verifying, not assuming).

## Known debt (not addressed by the last sync, flagged not fixed)

`yarn test:lint` currently reports ~700+ pre-existing errors across `src/store/`, `src/user/`, and other files not touched by the last sync — mostly a single/double-quote and semicolon convention mismatch against this package's own declared prettier config, not logic bugs. Worth a deliberate reformat pass at some point, not a silent one.
