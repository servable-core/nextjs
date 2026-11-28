import { describe, expect, test } from '@jest/globals';
import normalizeRouteError, {
  refusalOfRouteAnswer,
} from './normalizeRouteError.js';

const answeredError = (status, data) => ({
  response: { status, data, headers: {} },
  config: { method: 'post', url: '/v1/collective/invite', headers: {} },
  message: `Request failed with status code ${status}`,
});

describe('normalizeRouteError, a refusal the server explains', () => {
  test('lifts refusalCode and refusalDetails onto the error, and keeps the whole answer in details', () => {
    const data = {
      error: "This publication can't be invited.",
      code: 409,
      refusalCode: 'publication_not_invitable',
      refusalDetails: { isRetryable: false, blockers: ['blocked'] },
    };
    const error = normalizeRouteError(answeredError(409, data));
    expect(error.refusalCode).toBe('publication_not_invitable');
    expect(error.refusalDetails).toEqual({
      isRetryable: false,
      blockers: ['blocked'],
    });
    expect(error.message).toBe("This publication can't be invited.");
    expect(error.details).toEqual(data);
  });

  test('an answer without a refusal gives null for both', () => {
    const error = normalizeRouteError(
      answeredError(500, { error: 'An error occurred', code: 500 })
    );
    expect(error.refusalCode).toBeNull();
    expect(error.refusalDetails).toBeNull();
  });

  test('details without a code, or details that are not a plain object, are not lifted', () => {
    expect(
      refusalOfRouteAnswer({ refusalDetails: { isRetryable: true } })
    ).toEqual({ refusalCode: null, refusalDetails: null });
    expect(
      refusalOfRouteAnswer({ refusalCode: 'blocked', refusalDetails: ['a'] })
    ).toEqual({ refusalCode: 'blocked', refusalDetails: null });
    expect(refusalOfRouteAnswer({ refusalCode: 42 })).toEqual({
      refusalCode: null,
      refusalDetails: null,
    });
  });

  test('a request that got no answer has no refusal', () => {
    const error = normalizeRouteError({
      message: 'Network Error',
      config: { url: '/v1/x', headers: {} },
    });
    expect(error.refusalCode).toBeNull();
    expect(error.refusalDetails).toBeNull();
  });
});
