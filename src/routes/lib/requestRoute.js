import { getCookie } from "cookies-next";
import getHeaders from "./headers.js";
import runWithRetry from "./retry.js";
import { withDeviceParams } from "./device.js";
import { resolveTraceContext, withTraceHeaders } from "./trace.js";
import buildRouteUrl, { resolveServerUrl } from "./buildRouteUrl.js";
import normalizeRouteError from "./normalizeRouteError.js";
import servableAxios from "./axios.js";
import openAccountRedirect from "lib/account/lib/openaccountredirect";
import isCustomDomainHost from "./isCustomDomainHost.js";
import refreshAccessToken from "./refreshAccessToken.js";
import {
  getAccessToken,
  isAccessTokenExpired,
} from "../../user/accessTokenStore.js";

const buildRouteErrorResult = ({ status, message }) => ({
  userIsInvalid: true,
  error: {
    status,
    code: status,
    message,
    isTimeout: false,
    isNetworkError: false,
    isCanceled: false,
  },
});

const resolveResultData = (response) => response?.data;

export const prepareRouteRequest = async ({
  method,
  transportMethod,
  retryMethod,
  path,
  params = {},
  headers = {},
  traceparent,
  baggage,
  context,
  version,
  serverUrl,
  timeout,
  signal,
  data,
  includePlatformId = true,
  retryCount,
  retryInitialDelayMs,
  retryBackoffFactor,
  retryMaxDelayMs,
  retryOnStatuses,
  retryOnNetworkError,
}) => {
  // Proactive, not reactive: an EXPIRED (as opposed to entirely missing) access token doesn't
  // actually get rejected server-side - userResolver.js falls through to the still-valid legacy
  // session cookie, so the request just quietly succeeds anyway with a stale token still sitting
  // in memory. Refreshing here, before headers are even built, is what actually keeps the
  // access-token mechanism self-sustaining between page loads - the reactive refresh-on-209
  // path below still exists for the case where the token is outright missing/corrupt (or the
  // legacy cookie itself is gone), but confirmed live 2026-08-27 it never fires for plain
  // expiry. Client-side only - SSR calls (context set) authenticate via the legacy cookie
  // forwarding in headers.js instead.
  //
  // Also covers a genuinely MISSING token, not just an expired one - confirmed live 2026-09-04
  // (PEAKUB-137): the access token store is in-memory only and starts empty on every fresh page
  // load, rehydrated by pages/_app.js's own mount effect calling refreshAccessToken() - but that
  // effect races every other component's own mount-time fetch with nothing coordinating them.
  // A request built here before that effect's own refresh has landed went out with zero auth
  // headers and got a flat 209, even for a genuinely signed-in user - the reactive refresh-on-209
  // path below explicitly does NOT cover this (it only retries when getAccessToken() is already
  // truthy, on the assumption a token that was never there means "never logged in" - true for an
  // actually-anonymous visitor, false for this race). sproxy is the same signal _app.js's own
  // effect already gates on: present means the httpOnly refresh_token cookie should still mint a
  // real access token, so it's worth awaiting one proactive refresh before giving up and sending
  // the request unauthenticated. refreshAccessToken() itself dedupes concurrent callers (see its
  // own comment), so this doesn't risk piling up parallel refresh calls when several requests
  // hit this same gap at once right after a page load.
  if (!context) {
    const currentToken = getAccessToken();
    if (currentToken && isAccessTokenExpired(currentToken)) {
      await refreshAccessToken();
    } else if (!currentToken && getCookie("sproxy")) {
      await refreshAccessToken();
    }
  }

  const routeHeaders = await getHeaders({ context });
  const traceContext = resolveTraceContext({
    traceparent,
    baggage,
    headers,
  });
  const paramsWithDevice = withDeviceParams({ params, context });
  // On a creator's custom domain, route through the same-origin proxy (web/main's own
  // /api/proxy, wired up via next.config.js's /v1 rewrite) instead of calling
  // backend.peakub.com directly - the real session cookie can't survive that cross-eTLD+1
  // trip (Safari ITP, and increasingly Chrome/Firefox, block it as third-party regardless of
  // SameSite), so the proxy holds it server-side and forwards requests itself.
  //
  // buildRouteUrl/resolveServerUrl are bypassed ENTIRELY here rather than given an empty-string
  // override - confirmed live (2026-08-26) that doesn't work: resolveServerUrl's own fallback
  // chain ends with a bare `process?.env?.[key]` lookup, which this app's bundle satisfies via
  // its own module-scoped `process` polyfill (the same one leaf files like post.js default
  // `serverUrl` from) - it silently recovers the real backend.peakub.com URL regardless of what
  // gets passed in, undoing the override completely. Building the relative URL directly here
  // (mirroring buildRouteUrl's own relative-fallback segment normalization) is the only way to
  // guarantee no fallback path can recover an absolute URL. Only client-side calls are affected -
  // isCustomDomainHost is false during SSR, so getServerSideProps calls are untouched.
  const normalizeUrlSegment = (segment) =>
    String(segment || "").replace(/^\/+|\/+$/g, "");
  const isCustomDomain = isCustomDomainHost();
  // Kept distinct from "" meaning "unresolved" elsewhere - here it's the real, deliberate
  // resolution for a custom domain (relative/same-origin), and get/index.js's cache-key logic
  // (serverUrl: preparedRequest.resolvedServerUrl) relies on it differing from the absolute-URL
  // case so custom-domain GETs never share a cache entry with a normal peakub.com one.
  const resolvedServerUrl = isCustomDomain ? "" : resolveServerUrl(serverUrl);
  const url = isCustomDomain
    ? `/${normalizeUrlSegment(version) || "v1"}/${normalizeUrlSegment(path)}`
    : buildRouteUrl({ serverUrl: resolvedServerUrl, version, path });
  const headersWithTrace = withTraceHeaders({
    headers,
    traceContext,
  });

  const requestHeaders = {
    ...routeHeaders,
    ...headersWithTrace,
  };

  // Let Axios set the multipart boundary automatically for FormData payloads.
  if (typeof FormData !== "undefined" && data instanceof FormData) {
    delete requestHeaders["content-type"];
    delete requestHeaders["Content-Type"];
  }

  const requestConfig = {
    method: transportMethod || method,
    url,
    timeout,
    headers: requestHeaders,
    params: includePlatformId
      ? {
          ...paramsWithDevice,
          platformId: process.env.NEXT_PUBLIC_PLATFORM_ID,
        }
      : paramsWithDevice,
    signal,
    data,
    metadata: {
      method: retryMethod || method,
      url,
      traceparent: traceContext?.traceparent || null,
      baggage: traceContext?.baggage || null,
    },
  };

  return {
    requestConfig,
    resolvedServerUrl,
    paramsWithDevice,
    retryOptions: {
      method: retryMethod || method,
      retries: retryCount,
      initialDelayMs: retryInitialDelayMs,
      backoffFactor: retryBackoffFactor,
      maxDelayMs: retryMaxDelayMs,
      statuses: retryOnStatuses,
      retryOnNetworkError,
    },
  };
};

const handleRouteResponse = ({ response, redirectIfUserRequired = false }) => {
  switch (response?.status) {
    case 209: {
      if (redirectIfUserRequired) {
        openAccountRedirect();
      }

      return buildRouteErrorResult({
        status: response.status,
        message: response?.data?.error,
      });
    }
    default:
      return { result: resolveResultData(response) };
  }
};

// axios's default success range is 2xx, which 209 falls inside - so "invalid session token"
// can reach this code either as a normal response (handled in handleRouteResponse's own
// switch) or, depending on retry.js/axios config elsewhere, as a thrown error. attemptRequest
// normalizes both into one shape so the retry-with-refresh logic below only has to check once.
const attemptRequest = async ({ requestConfig, retryOptions }) => {
  try {
    const response = await runWithRetry(
      () => servableAxios(requestConfig),
      retryOptions,
    );
    return { response, error: null };
  } catch (caughtError) {
    const error = normalizeRouteError(caughtError, {
      method: requestConfig.metadata?.method || requestConfig.method,
      url: requestConfig.url,
      traceparent: requestConfig.metadata?.traceparent,
      baggage: requestConfig.metadata?.baggage,
    });
    return { response: null, error };
  }
};

const isSessionInvalid = ({ response, error }) =>
  response?.status === 209 || error?.status === 209;

// 449 ("Retry With") is backend's requireStepUp signal - distinct from 209 on purpose: it means
// "you ARE logged in, but this specific action needs a fresh password confirmation," not "log in
// again." Unlike 209, this can't be resolved silently (needs a human to type their password), so
// there's no automatic retry here - the caller gets back a resumable handle instead.
const isStepUpRequired = ({ response, error }) =>
  response?.status === 449 || error?.status === 449;

const finalizeOutcome = ({ response, error }, redirectIfUserRequired) => {
  if (error) {
    if (error.status === 209) {
      if (redirectIfUserRequired) {
        openAccountRedirect();
      }

      return {
        userIsInvalid: true,
        error,
      };
    }

    if (!error.isCanceled) {
      console.error("_______e", JSON.stringify(error));
    }

    return {
      userIsInvalid: false,
      error,
    };
  }

  return handleRouteResponse({ response, redirectIfUserRequired });
};

const requestRoute = async ({
  redirectIfUserRequired = false,
  preparedRequest,
  isRetryAfterRefresh = false,
  ...options
}) => {
  const activeRequest = preparedRequest || (await prepareRouteRequest(options));
  const { requestConfig, retryOptions } = activeRequest;

  const outcome = await attemptRequest({ requestConfig, retryOptions });

  if (isStepUpRequired(outcome)) {
    return {
      stepUpRequired: true,
      error: {
        status: 449,
        code: 449,
        message:
          outcome.error?.message ||
          outcome.response?.data?.error ||
          "Step-up authentication required",
      },
      // Call after lib/account/methods/confirmStepUp succeeds - re-issues this exact request
      // (same headers, same body) rather than requiring the caller to remember/rebuild it.
      retry: () =>
        requestRoute({
          ...options,
          redirectIfUserRequired,
          preparedRequest: activeRequest,
        }),
    };
  }

  // Only attempt a silent refresh-and-retry when this call actually believed it was
  // authenticated via an access token - a request that never carried one getting 209 means
  // "never logged in," not "token expired," and refreshing wouldn't change that. Capped at one
  // retry (isRetryAfterRefresh) so a refresh that doesn't fix things (refresh token also
  // expired) falls straight through to the normal openAccountRedirect() behavior below instead
  // of looping. Reuses the exact same requestConfig (just swapping the Authorization header) -
  // works uniformly whether the caller built it fresh or passed a preparedRequest (get/index.js),
  // no need to know or reconstruct the original raw options either way.
  if (isSessionInvalid(outcome) && !isRetryAfterRefresh && getAccessToken()) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      const retriedConfig = {
        ...requestConfig,
        headers: {
          ...requestConfig.headers,
          Authorization: `Bearer ${getAccessToken()}`,
        },
      };
      const retriedOutcome = await attemptRequest({
        requestConfig: retriedConfig,
        retryOptions,
      });
      return finalizeOutcome(retriedOutcome, redirectIfUserRequired);
    }
  }

  return finalizeOutcome(outcome, redirectIfUserRequired);
};

export default requestRoute;
