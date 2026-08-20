import getHeaders from "./headers.js";
import runWithRetry from "./retry.js";
import { withDeviceParams } from "./device.js";
import { resolveTraceContext, withTraceHeaders } from "./trace.js";
import buildRouteUrl, { resolveServerUrl } from "./buildRouteUrl.js";
import normalizeRouteError from "./normalizeRouteError.js";
import servableAxios from "./axios.js";
import openAccountRedirect from "lib/account/lib/openaccountredirect";

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
  const routeHeaders = await getHeaders({ context });
  const traceContext = resolveTraceContext({
    traceparent,
    baggage,
    headers,
  });
  const paramsWithDevice = withDeviceParams({ params, context });
  const resolvedServerUrl = resolveServerUrl(serverUrl);
  const url = buildRouteUrl({
    serverUrl: resolvedServerUrl,
    version,
    path,
  });
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

export default async ({
  redirectIfUserRequired = false,
  preparedRequest,
  ...options
}) => {
  const activeRequest = preparedRequest || (await prepareRouteRequest(options));
  const { requestConfig, retryOptions } = activeRequest;

  try {
    const response = await runWithRetry(
      () => servableAxios(requestConfig),
      retryOptions,
    );

    return handleRouteResponse({ response, redirectIfUserRequired });
  } catch (caughtError) {
    const error = normalizeRouteError(caughtError, {
      method: requestConfig.metadata?.method || requestConfig.method,
      url: requestConfig.url,
      traceparent: requestConfig.metadata?.traceparent,
      baggage: requestConfig.metadata?.baggage,
    });

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
};
