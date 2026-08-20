import requestRoute from "./lib/requestRoute.js";

const SERVABLE_BACKEND_VERSION =
  process.env.NEXT_PUBLIC_SERVABLE_BACKEND_VERSION || "v1";
const SERVABLE_TIMEOUT = Number(
  process.env.NEXT_PUBLIC_SERVABLE_TIMEOUT ||
    process.env.NEXT_PUBLIC_SERVABLE_TIMEOUT_MS ||
    15000,
);

export default async ({
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
  // retry options
  retryCount,
  retryInitialDelayMs,
  retryBackoffFactor,
  retryMaxDelayMs,
  retryOnStatuses,
  retryOnNetworkError,
}) => {
  return requestRoute({
    method: "DELETE",
    path,
    params,
    headers,
    traceparent,
    baggage,
    context,
    version,
    serverUrl,
    timeout,
    redirectIfUserRequired,
    signal,
    retryCount,
    retryInitialDelayMs,
    retryBackoffFactor,
    retryMaxDelayMs,
    retryOnStatuses,
    retryOnNetworkError,
  });
};
