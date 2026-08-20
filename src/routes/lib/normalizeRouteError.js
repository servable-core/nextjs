const getHeaderValue = (headers, key) => {
  if (!headers || typeof headers !== "object") {
    return undefined;
  }

  return headers[key] || headers[key?.toLowerCase?.()];
};

export default (error, meta = {}) => {
  const status = error?.response?.status ?? null;
  const code = error?.code || (status != null ? String(status) : null);
  const responseData = error?.response?.data;
  const message =
    responseData?.error || responseData?.message || error?.message || null;
  const requestHeaders = error?.config?.headers;
  const requestId =
    getHeaderValue(error?.response?.headers, "x-request-id") ||
    getHeaderValue(error?.response?.headers, "request-id") ||
    null;
  const traceparent =
    meta.traceparent || getHeaderValue(requestHeaders, "traceparent") || null;
  const baggage =
    meta.baggage || getHeaderValue(requestHeaders, "baggage") || null;
  const isCanceled =
    code === "ERR_CANCELED" ||
    error?.name === "CanceledError" ||
    error?.message === "canceled";
  const isTimeout =
    code === "ECONNABORTED" || /timeout/i.test(String(message || ""));
  const isNetworkError = !error?.response && !isCanceled;

  return {
    status,
    code,
    message,
    method: meta.method || error?.config?.method?.toUpperCase?.() || null,
    url: meta.url || error?.config?.url || null,
    isTimeout,
    isNetworkError,
    isCanceled,
    requestId,
    traceparent,
    baggage,
    durationMs: error?.config?.metadata?.durationMs ?? null,
    details: responseData || null,
  };
};
