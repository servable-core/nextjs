import { jest } from "@jest/globals";
import runWithRetry, { parseRetryAfterMs } from "./retry.js";

describe("runWithRetry", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("parses numeric Retry-After headers as milliseconds", () => {
    expect(parseRetryAfterMs("2")).toBe(2000);
  });

  test("retries GET requests using Retry-After delay", async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce({
        response: {
          status: 429,
          headers: {
            "retry-after": "1",
          },
        },
      })
      .mockResolvedValueOnce({ ok: true });

    const promise = runWithRetry(fn, {
      method: "GET",
      retries: 1,
    });

    expect(fn).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(1000);

    await expect(promise).resolves.toEqual({ ok: true });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  test("does not retry POST by default", async () => {
    const error = { response: { status: 503, headers: {} } };
    const fn = jest.fn().mockRejectedValue(error);

    await expect(runWithRetry(fn, { method: "POST" })).rejects.toBe(error);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
