import { getCookie } from "cookies-next";
import { getAccessToken } from "../../user/accessTokenStore.js";

export default async ({ context } = {}) => {
  let sessiontoken;
  let installationid;
  if (context) {
    const { req, res } = context;
    // _pk_sess fallback: SSR calls (getServerSideProps) go straight to backend.peakub.com,
    // server-to-server, so there's no cross-site-cookie problem to route around here the way
    // the client-side proxy does - the gap is simpler than that. On a custom domain,
    // x-servable-session-token (set by a direct response from backend.peakub.com) never
    // reaches this domain's cookie jar at all, so it's never present here regardless of
    // login state - but the browser DOES send this domain's own _pk_sess cookie (the one the
    // proxy set - see pages/api/proxy) on this very SSR request, same as any other cookie.
    // Confirmed live (2026-08-26): without this fallback, a real, successfully-completed
    // magic-link login still rendered every server-rendered page as signed-out, since SSR
    // had no way to find the token that login actually minted.
    sessiontoken =
      getCookie("x-servable-session-token", { req, res }) ||
      getCookie("_pk_sess", { req, res });
    installationid = getCookie("_platform_device_id", { req, res });
  } else {
    // sessiontoken = getCookie('x-servable-session-token')
    installationid = getCookie("_platform_device_id");
  }

  const payload = {
    // ...(req?.headers?.cookie || {}),
    // ...(getCookies({ req, res }) || {}),
    "content-type": "application/json",
    Accept: "application/json",
  };

  if (sessiontoken) {
    payload["X-Servable-Session-Token"] = sessiontoken;
  }

  if (installationid) {
    payload["X-Servable-Installation-Id"] = installationid;
  }

  // Client-side only (context is only set for SSR calls, which have no access to the in-memory
  // browser store) - the access token is additive to the legacy session-token cookie above, not
  // a replacement. userResolver.js checks this header first and falls back to the legacy
  // mechanism when it's absent, so this is safe to send even before AUTH_JWT_SECRET is
  // configured on a given deployment (it's simply never present on the store in that case).
  if (!context) {
    const accessToken = getAccessToken();
    if (accessToken) {
      payload["Authorization"] = `Bearer ${accessToken}`;
    }
  }

  return payload;
};
