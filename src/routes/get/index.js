import requestRoute, { prepareRouteRequest } from "../lib/requestRoute.js";

const SERVABLE_BACKEND_VERSION =
  process.env.NEXT_PUBLIC_SERVABLE_BACKEND_VERSION || "v1";
const SERVABLE_TIMEOUT = Number(
  process.env.NEXT_PUBLIC_SERVABLE_TIMEOUT ||
    process.env.NEXT_PUBLIC_SERVABLE_TIMEOUT_MS ||
    15000,
);

import buildCacheKey from "./buildCacheKey.js";
import readCache from "./readCache.js";
import writeCache from "./writeCache.js";
const Get = async ({
  path,
  params = {},
  headers = {},
  traceparent,
  baggage,
  context,
  version = SERVABLE_BACKEND_VERSION,
  serverUrl = process.env.NEXT_PUBLIC_SERVABLE_BACKEND_URL,
  timeout = SERVABLE_TIMEOUT,
  redirectIfUserRequired = false,
  signal,
  // caching options
  useCache = false,
  cacheKey,
  cacheExpireInMs,
  cacheExpireAt,
  // behavior flags
  preferCache = false, // if true and cache valid, return immediately without network
  forceNetwork = false, // if true, skip cache read and fetch from server
  // retry options
  retryCount = 3,
  retryInitialDelayMs,
  retryBackoffFactor,
  retryMaxDelayMs,
  retryOnStatuses,
  retryOnNetworkError,
}) => {
  const preparedRequest = await prepareRouteRequest({
    method: "GET",
    path,
    params,
    headers,
    traceparent,
    baggage,
    context,
    version,
    serverUrl,
    timeout,
    signal,
    retryCount,
    retryInitialDelayMs,
    retryBackoffFactor,
    retryMaxDelayMs,
    retryOnStatuses,
    retryOnNetworkError,
  });

  const key = useCache
    ? buildCacheKey({
        serverUrl: preparedRequest.resolvedServerUrl,
        version,
        path,
        params: preparedRequest.paramsWithDevice,
        cacheKey,
      })
    : null;
  if (!forceNetwork && preferCache && key) {
    const cached = readCache(key);
    if (cached != null) {
      return { result: cached, fromCache: true };
    }
    return { result: null, fromCache: false, cacheMiss: true };
  }

  if (!forceNetwork && useCache && key) {
    const cached = readCache(key);
    if (cached != null) {
      return { result: cached, fromCache: true };
    }
  }

  const response = await requestRoute({
    redirectIfUserRequired,
    preparedRequest,
  });

  if (response?.result != null && useCache && key) {
    writeCache(key, response.result, {
      expireAt: cacheExpireAt,
      expireInMs: cacheExpireInMs,
    });
  }

  return response;
};

export default Get;
