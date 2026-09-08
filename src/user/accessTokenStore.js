// In-memory only, deliberately - never localStorage/cookie. Same reasoning this codebase
// already applies to the real session token (see proxy/[...path].js's own comment): a bearer
// credential has no business in JS-readable persistent storage, even a short-lived one. Cost:
// a page reload loses it - pages/_app.js's mount effect proactively re-mints one via the
// httpOnly refresh_token cookie (see refreshAccessToken.js) whenever sproxy indicates a signed-
// in session, rather than waiting for a request to fail first (see isAccessTokenExpired's own
// comment for why that reactive path doesn't actually work for a merely-stale token).
let accessToken = null;
let refreshInFlight = null;

export const getAccessToken = () => accessToken;
export const setAccessToken = (token) => {
  accessToken = token || null;
};
export const clearAccessToken = () => {
  accessToken = null;
};

export const getRefreshInFlight = () => refreshInFlight;
export const setRefreshInFlight = (promise) => {
  refreshInFlight = promise;
};

// Decode-only, no signature check (that's the server's job on every real request regardless) -
// purely informational, to decide client-side whether to bother sending a token we already know
// backend will reject. This matters because an EXPIRED access token doesn't actually produce a
// 209 the way a MISSING one does: userResolver.js falls through to the still-valid legacy
// session cookie when JWT verification fails for any reason (including plain expiry), so the
// request just quietly succeeds via that path instead - confirmed live 2026-08-27, this is why
// requestRoute.js's reactive refresh-on-209 never fires for a merely-stale (as opposed to
// entirely absent) token. isAccessTokenExpired() is what lets a caller refresh proactively
// instead of waiting for a rejection that will never come.
export const isAccessTokenExpired = (token) => {
  if (!token) {
    return true;
  }

  try {
    const [, payload] = token.split(".");
    const { exp } = JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/")),
    );
    if (typeof exp !== "number") {
      return true;
    }
    return Date.now() >= exp * 1000;
  } catch (e) {
    return true;
  }
};
