// Generic retry helper for axios calls
// Provides exponential backoff with optional jitter and method-aware defaults

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

const DEFAULT_STATUS_CODES = [408, 429, 502, 503, 504, 522, 524];

const getMethodDefaults = (method = "GET") => {
  const m = String(method || "GET").toUpperCase();
  // Safer defaults for non-idempotent requests
  if (m === "POST" || m === "FUNCTION") {
    return {
      retries: 0,
      retryOnNetworkError: true,
      statuses: DEFAULT_STATUS_CODES,
    };
  }
  // Idempotent routes can retry more
  return {
    retries: 1,
    retryOnNetworkError: true,
    statuses: DEFAULT_STATUS_CODES,
  };
};

const parseRetryAfterMs = (value) => {
  if (value == null) {
    return null;
  }

  const numericSeconds = Number(value);
  if (Number.isFinite(numericSeconds)) {
    return Math.max(0, numericSeconds * 1000);
  }

  const absoluteTime = Date.parse(value);
  if (Number.isFinite(absoluteTime)) {
    return Math.max(0, absoluteTime - Date.now());
  }

  return null;
};

/**
 * runWithRetry
 * @param {Function} fn - async function performing the axios call and returning a Promise
 * @param {Object} opts - options
 * @param {string} opts.method - HTTP method (affects defaults)
 * @param {number} [opts.retries]
 * @param {number} [opts.initialDelayMs]
 * @param {number} [opts.backoffFactor]
 * @param {number} [opts.maxDelayMs]
 * @param {boolean} [opts.retryOnNetworkError]
 * @param {number[]} [opts.statuses]
 */
const runWithRetry = async (fn, opts = {}) => {
  const {
    method = "GET",
    retries: _retries,
    initialDelayMs = 300,
    backoffFactor = 2,
    maxDelayMs = 3000,
    retryOnNetworkError: _retryOnNetworkError,
    statuses: _statuses,
  } = opts;

  const defaults = getMethodDefaults(method);
  const retries = typeof _retries === "number" ? _retries : defaults.retries;
  const retryOnNetworkError =
    typeof _retryOnNetworkError === "boolean"
      ? _retryOnNetworkError
      : defaults.retryOnNetworkError;
  const statuses =
    Array.isArray(_statuses) && _statuses.length
      ? _statuses
      : defaults.statuses;

  let attempt = 0;
  let lastError;
  const totalAttempts = Math.max(0, retries) + 1;

  while (attempt < totalAttempts) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      attempt += 1;
      if (attempt >= totalAttempts) break;

      const isNetworkError = !err?.response;
      const status = err?.response?.status;
      const shouldRetry =
        (retryOnNetworkError && isNetworkError) ||
        (status && statuses.includes(status));
      if (!shouldRetry) break;

      const retryAfterMs = parseRetryAfterMs(
        err?.response?.headers?.["retry-after"],
      );
      const exponentialDelay = Math.min(
        initialDelayMs * Math.pow(backoffFactor, attempt - 1),
        maxDelayMs,
      );
      const jitter = retryAfterMs == null ? Math.floor(Math.random() * 100) : 0;
      await sleep((retryAfterMs ?? exponentialDelay) + jitter);
      continue;
    }
  }

  throw lastError;
};

export default runWithRetry;
export { parseRetryAfterMs };
