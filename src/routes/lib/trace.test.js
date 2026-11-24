import { beforeEach, describe, expect, it, jest } from '@jest/globals';

// What production does (owner's Q1690 a, 2026-11-24): Sentry makes ONE propagation context when it starts and
// every scope forked for a request copies it (@sentry/core scope.js, clone). Reading the trace id from the scope's
// propagation context therefore gave every server-side call of a web/main process the same trace id for its whole
// life: in Tempo, trace f818b0eb8f674238877776c263be1efb held 201 unrelated backend requests from 2026-11-20 12:00
// (the pod's start) to 11-24. The trace of a call is the active span's (one per request), or a new one.
//
// @sentry/nextjs is a peer dependency, not installed here (jest.config.js maps it to a stand-in): its scope is stood in for by one that behaves as
// Sentry's does (a propagation context made once, copied by every clone).

let mockCurrentScope;
let mockActiveSpan;

jest.unstable_mockModule('@sentry/nextjs', () => ({
  getCurrentScope: () => mockCurrentScope,
  getActiveSpan: () => mockActiveSpan,
}));

const { resolveTraceContext } = await import('./trace.js');

class Scope {
  constructor() {
    this._propagationContext = {
      traceId: [...Array(32)]
        .map(() => Math.floor(Math.random() * 16).toString(16))
        .join(''),
    };
  }

  clone() {
    const scope = new Scope();
    scope._propagationContext = { ...this._propagationContext };
    return scope;
  }

  getPropagationContext() {
    return this._propagationContext;
  }
}

const TRACEPARENT_PATTERN = /^00-([0-9a-f]{32})-([0-9a-f]{16})-01$/;

// The scope Sentry makes at start, and one scope per request forked from it, as Sentry does.
const processScope = new Scope();
const requestScopeForkedFromTheProcessScope = () => processScope.clone();

const spanWithContext = ({ traceId, spanId, traceFlags = 1 }) => ({
  spanContext: () => ({ traceId, spanId, traceFlags }),
});

const traceContextOfARequest = ({ activeSpan } = {}) => {
  mockCurrentScope = requestScopeForkedFromTheProcessScope();
  mockActiveSpan = activeSpan;
  return resolveTraceContext({});
};

describe('resolveTraceContext', () => {
  beforeEach(() => {
    mockCurrentScope = undefined;
    mockActiveSpan = undefined;
  });

  it('gives two requests of the same process two different trace ids, though Sentry hands them the same propagation context', () => {
    const first = traceContextOfARequest();
    const second = traceContextOfARequest();

    expect(mockCurrentScope.getPropagationContext().traceId).toBe(
      processScope.getPropagationContext().traceId
    );
    expect(first.trace_id).not.toBe(second.trace_id);
    expect(first.trace_id).not.toBe(
      processScope.getPropagationContext().traceId
    );
    expect(second.trace_id).not.toBe(
      processScope.getPropagationContext().traceId
    );
  });

  it('continues the active span of the request: its trace id, and its span id as the parent', () => {
    const traceContext = traceContextOfARequest({
      activeSpan: spanWithContext({
        traceId: '0af7651916cd43dd8448eb211c80319c',
        spanId: 'b7ad6b7169203331',
      }),
    });

    expect(traceContext.trace_id).toBe('0af7651916cd43dd8448eb211c80319c');
    expect(traceContext.span_id).toBe('b7ad6b7169203331');
    expect(traceContext.traceparent).toBe(
      '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01'
    );
  });

  it("gives two concurrent requests their own active span's trace", () => {
    const first = traceContextOfARequest({
      activeSpan: spanWithContext({
        traceId: '11111111111111111111111111111111',
        spanId: '1111111111111111',
      }),
    });
    const second = traceContextOfARequest({
      activeSpan: spanWithContext({
        traceId: '22222222222222222222222222222222',
        spanId: '2222222222222222',
      }),
    });

    expect(first.trace_id).toBe('11111111111111111111111111111111');
    expect(second.trace_id).toBe('22222222222222222222222222222222');
  });

  it("marks the call as recorded even when Sentry did not keep the request's span: Sentry's sampling never decides what backend/main records", () => {
    const traceContext = traceContextOfARequest({
      activeSpan: spanWithContext({
        traceId: '0af7651916cd43dd8448eb211c80319c',
        spanId: 'b7ad6b7169203331',
        traceFlags: 0,
      }),
    });

    expect(traceContext.traceparent).toMatch(TRACEPARENT_PATTERN);
  });

  it("starts a new trace when the active span has no valid trace (OpenTelemetry's all-zero one)", () => {
    const traceContext = traceContextOfARequest({
      activeSpan: spanWithContext({
        traceId: '00000000000000000000000000000000',
        spanId: '0000000000000000',
      }),
    });

    expect(traceContext.trace_id).toMatch(/^[0-9a-f]{32}$/);
    expect(traceContext.trace_id).not.toBe('00000000000000000000000000000000');
    expect(traceContext.span_id).not.toBe('0000000000000000');
  });

  it('starts a new, recorded trace for each call made with no active span', () => {
    const first = traceContextOfARequest();
    const second = traceContextOfARequest();

    expect(first.traceparent).toMatch(TRACEPARENT_PATTERN);
    expect(second.traceparent).toMatch(TRACEPARENT_PATTERN);
    expect(first.trace_id).not.toBe(second.trace_id);
    expect(first.span_id).not.toBe(second.span_id);
  });

  it('keeps a traceparent the caller passed, as it is', () => {
    mockActiveSpan = spanWithContext({
      traceId: '0af7651916cd43dd8448eb211c80319c',
      spanId: 'b7ad6b7169203331',
    });

    const traceContext = resolveTraceContext({
      traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
    });

    expect(traceContext.traceparent).toBe(
      '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01'
    );
    expect(traceContext.trace_id).toBe('4bf92f3577b34da6a3ce929d0e0e4736');
    expect(traceContext.span_id).toBe('00f067aa0ba902b7');
  });

  it("writes the trace it chose into the baggage, keeping the caller's other entries", () => {
    const traceContext = resolveTraceContext({
      traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
      baggage: 'tenant=peakub',
    });

    expect(traceContext.baggage).toBe(
      'tenant=peakub,trace_id=4bf92f3577b34da6a3ce929d0e0e4736,span_id=00f067aa0ba902b7'
    );
  });
});
