import * as Sentry from "@sentry/nextjs";

const TRACEPARENT_HEADER = "traceparent";
const BAGGAGE_HEADER = "baggage";
const SENTRY_TRACE_HEADER = "sentry-trace";

const TRACEPARENT_RE = /^00-([0-9a-f]{32})-([0-9a-f]{16})-[0-9a-f]{2}$/i;
const SENTRY_TRACE_RE = /^([0-9a-f]{32})-([0-9a-f]{16})(?:-([01]))?$/i;

const getHeaderValue = (headers = {}, headerName = "") => {
  const wanted = headerName.toLowerCase();
  for (const [key, value] of Object.entries(headers || {})) {
    if (key.toLowerCase() === wanted) {
      return value;
    }
  }
  return undefined;
};

const getRandomHex = (length) => {
  const bytesLength = Math.ceil(length / 2);
  let bytes;

  if (globalThis?.crypto?.getRandomValues) {
    bytes = new Uint8Array(bytesLength);
    globalThis.crypto.getRandomValues(bytes);
  } else {
    bytes = Array.from({ length: bytesLength }, () =>
      Math.floor(Math.random() * 256),
    );
  }

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
    "",
  );
  return hex.slice(0, length);
};

const parseTraceparent = (traceparent) => {
  if (typeof traceparent !== "string") {
    return {};
  }

  const match = traceparent.trim().match(TRACEPARENT_RE);
  if (!match) {
    return {};
  }

  return {
    trace_id: match[1].toLowerCase(),
    span_id: match[2].toLowerCase(),
  };
};

const parseSentryTrace = (sentryTrace) => {
  if (typeof sentryTrace !== "string") {
    return {};
  }

  const match = sentryTrace.trim().match(SENTRY_TRACE_RE);
  if (!match) {
    return {};
  }

  return {
    trace_id: match[1].toLowerCase(),
    span_id: match[2].toLowerCase(),
    sampled: match[3] === "1" ? true : match[3] === "0" ? false : undefined,
  };
};

const parseBaggage = (baggage) => {
  if (typeof baggage !== "string" || !baggage.trim()) {
    return {};
  }

  const values = {};
  for (const entry of baggage.split(",")) {
    const [rawKey, rawValue] = entry.split("=");
    if (!rawKey || rawValue == null) {
      continue;
    }

    const key = rawKey.trim();
    const value = rawValue.split(";")[0]?.trim();
    if (!key || !value) {
      continue;
    }

    values[key] = decodeURIComponent(value);
  }

  return values;
};

const buildBaggage = ({ currentBaggage = "", trace_id, span_id }) => {
  const entries = parseBaggage(currentBaggage);
  entries.trace_id = trace_id;
  entries.span_id = span_id;

  return Object.entries(entries)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join(",");
};

const buildTraceparent = ({ trace_id, span_id, sampled = true }) =>
  `00-${trace_id}-${span_id}-${sampled ? "01" : "00"}`;

const getSentryTraceContext = () => {
  try {
    const scope = Sentry.getCurrentScope?.();
    const propagationContext = scope?.getPropagationContext?.() || {};
    const parsedSentryTrace = parseSentryTrace(
      typeof propagationContext.traceparent === "string"
        ? propagationContext.traceparent
        : undefined,
    );

    return {
      trace_id:
        parsedSentryTrace.trace_id ||
        (typeof propagationContext.traceId === "string"
          ? propagationContext.traceId
          : undefined),
      span_id:
        parsedSentryTrace.span_id ||
        (typeof propagationContext.spanId === "string"
          ? propagationContext.spanId
          : undefined),
      sampled:
        parsedSentryTrace.sampled ??
        (typeof propagationContext.sampled === "boolean"
          ? propagationContext.sampled
          : undefined),
      baggage:
        typeof propagationContext.baggage === "string"
          ? propagationContext.baggage
          : undefined,
    };
  } catch (_err) {
    return {};
  }
};

export const resolveTraceContext = ({
  traceparent,
  baggage,
  headers = {},
} = {}) => {
  const traceparentHeader =
    traceparent || getHeaderValue(headers, TRACEPARENT_HEADER);
  const baggageHeader = baggage || getHeaderValue(headers, BAGGAGE_HEADER);
  const sentryTraceContext = getSentryTraceContext();

  const parsedTraceparent = parseTraceparent(traceparentHeader);
  const parsedBaggage = parseBaggage(baggageHeader);

  const resolvedTraceId =
    parsedTraceparent.trace_id ||
    parsedBaggage.trace_id ||
    sentryTraceContext.trace_id ||
    getRandomHex(32);

  const resolvedSpanId =
    parsedTraceparent.span_id ||
    parsedBaggage.span_id ||
    sentryTraceContext.span_id ||
    getRandomHex(16);

  const resolvedTraceparent =
    traceparentHeader && parsedTraceparent.trace_id && parsedTraceparent.span_id
      ? traceparentHeader
      : buildTraceparent({
          trace_id: resolvedTraceId,
          span_id: resolvedSpanId,
          sampled: sentryTraceContext.sampled,
        });

  const resolvedBaggage = buildBaggage({
    currentBaggage: baggageHeader || sentryTraceContext.baggage,
    trace_id: resolvedTraceId,
    span_id: resolvedSpanId,
  });

  return {
    trace_id: resolvedTraceId,
    span_id: resolvedSpanId,
    traceparent: resolvedTraceparent,
    baggage: resolvedBaggage,
  };
};

export const withTraceHeaders = ({ headers = {}, traceContext = {} }) => ({
  ...headers,
  [TRACEPARENT_HEADER]: traceContext.traceparent,
  [BAGGAGE_HEADER]: traceContext.baggage,
});
