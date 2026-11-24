import * as Sentry from "@sentry/nextjs";

const TRACEPARENT_HEADER = "traceparent";
const BAGGAGE_HEADER = "baggage";

const TRACEPARENT_RE = /^00-([0-9a-f]{32})-([0-9a-f]{16})-[0-9a-f]{2}$/i;

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

const TRACE_ID_RE = /^[0-9a-f]{32}$/i;
const SPAN_ID_RE = /^[0-9a-f]{16}$/i;
const isValidId = (value, pattern) =>
  typeof value === "string" && pattern.test(value) && !/^0+$/.test(value);

// The trace of the work running now: the active span's (on the server, the span Sentry or Next.js
// opened for this request; in the browser, the page load or navigation), so every call a request
// makes shares the request's trace and no other request's.
//
// Never the scope's propagation context (owner's Q1690 a, 2026-11-24): Sentry makes one when it
// starts and every scope forked for a request copies it, so on the server it is the same trace id
// for the life of the process. Read from there, every server-side call of a web/main pod carried
// one trace id: in Tempo, trace f818b0eb8f674238877776c263be1efb held 201 unrelated backend/main
// requests from the pod's start (2026-11-20 12:00) to 11-24.
const getActiveSpanTraceContext = () => {
  try {
    const spanContext = Sentry.getActiveSpan?.()?.spanContext?.();
    if (
      !isValidId(spanContext?.traceId, TRACE_ID_RE) ||
      !isValidId(spanContext?.spanId, SPAN_ID_RE)
    ) {
      return {};
    }

    return {
      trace_id: spanContext.traceId.toLowerCase(),
      span_id: spanContext.spanId.toLowerCase(),
    };
  } catch (_err) {
    return {};
  }
};

// Where the trace of a call comes from, first found wins: a traceparent the caller passed, a trace
// the caller's baggage names, the active span; otherwise a new trace of its own, per call. The ids
// come from one source, never a trace id from one and a parent span id from another.
//
// The call is always marked recorded (flag 01): web/main's spans go to Sentry, sampled there, and
// never to Tempo, so Sentry's sampling must not decide which backend requests backend/main records.
export const resolveTraceContext = ({
  traceparent,
  baggage,
  headers = {},
} = {}) => {
  const traceparentHeader =
    traceparent || getHeaderValue(headers, TRACEPARENT_HEADER);
  const baggageHeader = baggage || getHeaderValue(headers, BAGGAGE_HEADER);

  const parsedTraceparent = parseTraceparent(traceparentHeader);
  const parsedBaggage = parseBaggage(baggageHeader);
  const baggageTraceContext = isValidId(parsedBaggage.trace_id, TRACE_ID_RE)
    ? {
        trace_id: parsedBaggage.trace_id.toLowerCase(),
        span_id: isValidId(parsedBaggage.span_id, SPAN_ID_RE)
          ? parsedBaggage.span_id.toLowerCase()
          : undefined,
      }
    : {};

  const chosenTraceContext = [
    parsedTraceparent,
    baggageTraceContext,
    getActiveSpanTraceContext(),
  ].find((candidate) => candidate.trace_id) || {};

  const resolvedTraceId = chosenTraceContext.trace_id || getRandomHex(32);
  const resolvedSpanId = chosenTraceContext.span_id || getRandomHex(16);

  const resolvedTraceparent =
    traceparentHeader && parsedTraceparent.trace_id && parsedTraceparent.span_id
      ? traceparentHeader
      : buildTraceparent({
          trace_id: resolvedTraceId,
          span_id: resolvedSpanId,
          sampled: true,
        });

  const resolvedBaggage = buildBaggage({
    currentBaggage: baggageHeader,
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
