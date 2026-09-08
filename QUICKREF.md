# @servable/nextjs — Quick Reference

## Env vars (consuming app's `.env`)

```bash
NEXT_PUBLIC_SERVABLE_BACKEND_URL=https://backend.example.com   # or NEXT_PUBLIC_BACKEND_URL / SERVABLE_BACKEND_URL / BACKEND_URL
NEXT_PUBLIC_SERVABLE_BACKEND_VERSION=v1                          # default: v1
NEXT_PUBLIC_SERVABLE_TIMEOUT=15000                                # ms, default: 15000 (also accepts _TIMEOUT_MS)
NEXT_PUBLIC_PLATFORM_ID=your-platform-id                          # sent as a query param on every request
```

Also requires a `lib/account/lib/openaccountredirect` module somewhere resolvable via your app's own `baseUrl`-relative imports — called on an invalid/expired session. See `CLAUDE.md` for the full contract.

## Setup

```js
// pages/_app.js or similar
import Servable from "@servable/nextjs";
```

## Calling a route directly

```js
const { result, error, userIsInvalid } = await Servable.Routes.Get({
  path: "bookclubsuite/presentation",
  params: { publicationId: "abc" },
});

await Servable.Routes.Post({ path: "some/route", params: {} });
await Servable.Routes.Function({ name: "someCloudFunction", params: {} });
```

Every route function accepts: `path`, `params`, `headers`, `context` (Next.js `{ req, res }` for SSR), `version`, `serverUrl`, `timeout`, `redirectIfUserRequired`, `signal` (for `AbortController`), and retry overrides (`retryCount`, `retryInitialDelayMs`, `retryBackoffFactor`, `retryMaxDelayMs`, `retryOnStatuses`, `retryOnNetworkError`).

`Get` additionally takes `useCache`, `cacheKey`, `cacheExpireInMs`/`cacheExpireAt`, `preferCache`, `forceNetwork`.

## React hooks

```jsx
const [result, error, isLoading, userIsInvalid, reload] = Servable.hooks.useServableRouteGet({
  routeName: "bookclubsuite/presentation",
  params: { publicationId },
});
```

```jsx
const [result, error, isLoading, userIsInvalid, reload] = Servable.hooks.useServableFunction({
  routeName: "someCloudFunction",
  httpMethod: "function", // or "get" to hit a GET route instead
  cachePolicy: "cache-first", // 'cache-only' | 'cache-first' | 'network-only' (GET only)
  params: {},
});
```

Both re-fetch automatically when `routeName`/`params`/`httpMethod` change (pass `deps` for anything else that should trigger a refetch). Call `reload()` to force a refetch manually.

## User / session

```js
const user = Servable.User.current(); // sync, reads from local store
const user = await Servable.User.currentAsync(); // may hit network
Servable.User.saveCurrentLocally(userObject);
```

## Store (cookie-backed key/value)

```js
Servable.store.setStoreValue({ id: "some-key", value: "some-value", context }); // context optional, for SSR
const value = Servable.store.getStoreValue({ id: "some-key", context });
```

## File uploads via `Function`

```js
await Servable.Routes.Function({
  name: "uploadSomething",
  files: [{ base64: dataUri, fileName: "photo.jpg" }],
});
```
