const getLocaleFromNavigator = () => {
  if (typeof navigator === "undefined") {
    return undefined;
  }

  if (Array.isArray(navigator.languages) && navigator.languages.length > 0) {
    return navigator.languages[0];
  }

  return (
    navigator.userLanguage ||
    navigator.language ||
    navigator.browserLanguage ||
    undefined
  );
};

const getLocaleFromContext = (context) => {
  if (!context) {
    return undefined;
  }

  if (typeof context.locale === "string" && context.locale.length > 0) {
    return context.locale;
  }

  if (
    typeof context.defaultLocale === "string" &&
    context.defaultLocale.length > 0
  ) {
    return context.defaultLocale;
  }

  const acceptLanguage = context.req?.headers?.["accept-language"];
  if (typeof acceptLanguage === "string" && acceptLanguage.length > 0) {
    return acceptLanguage.split(",")[0]?.trim();
  }

  return undefined;
};

const getLocaleFromIntl = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale;
  } catch {
    return undefined;
  }
};

const getTimeZoneFromHeaders = (context) => {
  if (!context?.req?.headers) {
    return undefined;
  }
  const headers = context.req.headers;
  return (
    headers["x-time-zone"] ||
    headers["x-timezone"] ||
    headers["x-vercel-ip-timezone"] ||
    undefined
  );
};

const getTimeZoneFromIntl = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
};

const SOURCE_QUERY_KEYS = {
  sourceNature: "utm_sourcenature",
  sourceId: "utm_referralid",
  sourceFromId: "utm_referralfromid",
  sourceFromType: "utm_referralfromtype",
  sourceToken: "utm_sourcetoken",
};

const getSearchParamsFromContext = (context) => {
  if (!context) {
    return null;
  }

  if (context.query && typeof context.query === "object") {
    return context.query;
  }

  const url = context.req?.url;
  const host = context.req?.headers?.host || "localhost";
  if (url) {
    try {
      return new URL(url, `http://${host}`).searchParams;
    } catch {
      return null;
    }
  }

  return null;
};

const getSearchParamsFromWindow = () => {
  if (typeof window === "undefined" || !window.location?.search) {
    return null;
  }

  try {
    return new URLSearchParams(window.location.search);
  } catch {
    return null;
  }
};

const normalizeSearchParamValue = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  if (Array.isArray(value)) {
    return value.find(Boolean) || null;
  }

  return typeof value === "string" ? value : null;
};

const buildSourcePayload = ({ context } = {}) => {
  const searchParams =
    getSearchParamsFromContext(context) || getSearchParamsFromWindow();

  if (!searchParams) {
    return null;
  }

  const payload = {};
  Object.entries(SOURCE_QUERY_KEYS).forEach(([key, queryKey]) => {
    const rawValue =
      typeof searchParams.get === "function"
        ? searchParams.get(queryKey)
        : searchParams[queryKey];
    const value = normalizeSearchParamValue(rawValue);
    if (value) {
      payload[key] = value;
    }
  });

  return Object.keys(payload).length ? payload : null;
};

const buildDevicePayload = ({ context } = {}) => {
  const locale =
    getLocaleFromContext(context) ||
    getLocaleFromNavigator() ||
    getLocaleFromIntl();

  const timeZone =
    getTimeZoneFromHeaders(context) || getTimeZoneFromIntl() || undefined;

  const device = {};
  if (locale) {
    device.locale = locale.toLowerCase();
  }
  if (timeZone) {
    device.timeZone = timeZone.toLowerCase();
  }

  return Object.keys(device).length ? device : null;
};

export const withDeviceParams = ({ params, context } = {}) => {
  const normalizedParams = params && typeof params === "object" ? params : {};
  const deviceFromParams =
    normalizedParams &&
    typeof normalizedParams.device === "object" &&
    normalizedParams.device !== null
      ? normalizedParams.device
      : null;
  const analyticsFromParams =
    normalizedParams &&
    typeof normalizedParams.utm_analytics === "object" &&
    normalizedParams.utm_analytics !== null
      ? normalizedParams.utm_analytics
      : null;

  const detectedDevice = buildDevicePayload({ context });

  let paramsWithDevice = normalizedParams;
  if (detectedDevice) {
    paramsWithDevice = {
      ...paramsWithDevice,
      device: {
        ...detectedDevice,
        ...(deviceFromParams || {}),
      },
    };
  }

  const sourceParams = buildSourcePayload({ context });
  if (!sourceParams) {
    return paramsWithDevice;
  }

  const mergedAnalytics = { ...(analyticsFromParams || {}) };
  Object.entries(sourceParams).forEach(([key, value]) => {
    if (mergedAnalytics[key] === undefined || mergedAnalytics[key] === null) {
      mergedAnalytics[key] = value;
    }
  });

  return Object.keys(mergedAnalytics).length
    ? { ...paramsWithDevice, utm_analytics: mergedAnalytics }
    : paramsWithDevice;
};

export default buildDevicePayload;
