const getHeaderValue = (headers, key) => {
  if (!headers || typeof headers !== "object") {
    return undefined;
  }

  return headers[key] || headers[key?.toLowerCase?.()];
};

// A refusal the server explains: a route that throws an error with a `refusalCode` answers it, with `refusalDetails`
// when the error carried plain details (`@servable/parse-server-engine` 4.4.0, errorAnswer.js). Lifted onto the error
// so a caller reads `error.refusalCode` and `error.refusalDetails`; `details` keeps the whole answer as before.
export const refusalOfRouteAnswer = (responseData) => {
  const refusalCode =
    typeof responseData?.refusalCode === "string" && responseData.refusalCode
      ? responseData.refusalCode
      : null;
  const refusalDetails =
    refusalCode &&
    responseData?.refusalDetails &&
    typeof responseData.refusalDetails === "object" &&
    !Array.isArray(responseData.refusalDetails)
      ? responseData.refusalDetails
      : null;
  return { refusalCode, refusalDetails };
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
  const { refusalCode, refusalDetails } = refusalOfRouteAnswer(responseData);

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
    refusalCode,
    refusalDetails,
    details: responseData || null,
  };
};
