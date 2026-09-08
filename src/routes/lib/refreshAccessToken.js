import servableAxios from "./axios.js";
import buildRouteUrl from "./buildRouteUrl.js";
import isCustomDomainHost from "./isCustomDomainHost.js";
import getHeaders from "./headers.js";
import {
  setAccessToken,
  getRefreshInFlight,
  setRefreshInFlight,
} from "../../user/accessTokenStore.js";

const SERVABLE_BACKEND_VERSION =
  process.env.NEXT_PUBLIC_SERVABLE_BACKEND_VERSION || "v1";

// Custom-domain traffic already routes every other call through web/main's own same-origin
// proxy (pages/api/proxy) because the real session cookie can't survive a cross-eTLD+1 trip -
// the refresh_token cookie set by mint.js has the exact same restriction. The proxy forwards it
// as x-servable-refresh-token and mints its own copy on the way back (see proxy's own comment) -
// this resolves to the proxy's relative URL shape, which routes there via next.config.js's
// generic /v1/:path* rewrite, same as every other call.
const resolveRefreshUrl = () => {
  if (isCustomDomainHost()) {
    return `/${SERVABLE_BACKEND_VERSION}/account/refreshtoken`;
  }

  return buildRouteUrl({
    serverUrl: process.env.NEXT_PUBLIC_SERVABLE_BACKEND_URL,
    version: SERVABLE_BACKEND_VERSION,
    path: "account/refreshtoken",
  });
};

const performRefresh = async () => {
  try {
    // Reuses the same header-building chokepoint every other request goes through - in
    // particular x-servable-installation-id, which backend's device-binding check compares
    // against the installationId the refresh token was originally minted under. Missing this
    // would make device binding silently fail open on every refresh.
    const headers = await getHeaders({});
    const response = await servableAxios({
      method: "POST",
      url: resolveRefreshUrl(),
      headers,
    });

    const accessToken = response?.data?.accessToken;
    if (!accessToken) {
      return false;
    }

    setAccessToken(accessToken);
    return true;
  } catch (e) {
    return false;
  }
};

// Deduplicates concurrent refreshes - if several requests fail with an expired access token at
// once, only one actual network call goes out; the rest await the same in-flight promise.
export default async () => {
  if (typeof window === "undefined") {
    return false;
  }

  let inFlight = getRefreshInFlight();
  if (!inFlight) {
    inFlight = performRefresh().finally(() => setRefreshInFlight(null));
    setRefreshInFlight(inFlight);
  }
  return inFlight;
};
