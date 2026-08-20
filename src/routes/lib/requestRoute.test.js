import { jest } from "@jest/globals";

const mockHeaders = jest.fn();
const mockWithDeviceParams = jest.fn();
const mockResolveTraceContext = jest.fn();
const mockWithTraceHeaders = jest.fn();
const mockServableAxios = jest.fn();
const mockOpenAccountRedirect = jest.fn();

jest.unstable_mockModule("./headers.js", () => ({
  __esModule: true,
  default: (...args) => mockHeaders(...args),
}));

jest.unstable_mockModule("./device.js", () => ({
  __esModule: true,
  withDeviceParams: (...args) => mockWithDeviceParams(...args),
}));

jest.unstable_mockModule("./trace.js", () => ({
  __esModule: true,
  resolveTraceContext: (...args) => mockResolveTraceContext(...args),
  withTraceHeaders: (...args) => mockWithTraceHeaders(...args),
}));

jest.unstable_mockModule("./axios.js", () => ({
  __esModule: true,
  default: (...args) => mockServableAxios(...args),
}));

jest.unstable_mockModule("lib/account/lib/openaccountredirect", () => ({
  __esModule: true,
  default: (...args) => mockOpenAccountRedirect(...args),
}));

describe("requestRoute", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_PLATFORM_ID = "peakub";

    mockHeaders.mockResolvedValue({
      Accept: "application/json",
    });
    mockWithDeviceParams.mockReturnValue({
      locale: "en-gb",
    });
    mockResolveTraceContext.mockReturnValue({
      traceparent: "trace-parent",
      baggage: "trace-baggage",
    });
    mockWithTraceHeaders.mockReturnValue({
      traceparent: "trace-parent",
      baggage: "trace-baggage",
    });
  });

  test("prepares request config with platformId and resolved URL", async () => {
    const { prepareRouteRequest } = await import("./requestRoute.js");
    const signal = new AbortController().signal;

    const prepared = await prepareRouteRequest({
      method: "GET",
      path: "bookclubsuite/presentation",
      version: "v1",
      serverUrl: "https://backend.peakub.com/",
      signal,
      params: {
        publicationId: "abc",
      },
    });

    expect(prepared.resolvedServerUrl).toBe("https://backend.peakub.com");
    expect(prepared.requestConfig.url).toBe(
      "https://backend.peakub.com/v1/bookclubsuite/presentation",
    );
    expect(prepared.requestConfig.params).toEqual({
      locale: "en-gb",
      platformId: "peakub",
    });
    expect(prepared.requestConfig.signal).toBe(signal);
  });

  test("normalizes timeout errors", async () => {
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mockServableAxios.mockRejectedValue({
      code: "ECONNABORTED",
      message: "timeout of 15000ms exceeded",
      config: {
        method: "GET",
        url: "https://backend.peakub.com/v1/bookclubsuite/presentation",
        headers: {
          traceparent: "trace-parent",
        },
        metadata: {
          durationMs: 15000,
        },
      },
    });

    const { default: requestRoute } = await import("./requestRoute.js");
    const response = await requestRoute({
      method: "GET",
      path: "bookclubsuite/presentation",
      version: "v1",
      serverUrl: "https://backend.peakub.com",
    });

    expect(response.userIsInvalid).toBe(false);
    expect(response.error.isTimeout).toBe(true);
    expect(response.error.url).toBe(
      "https://backend.peakub.com/v1/bookclubsuite/presentation",
    );
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
  });

  test("redirects when backend returns status 209", async () => {
    mockServableAxios.mockResolvedValue({
      status: 209,
      data: {
        error: "user invalid",
      },
    });

    const { default: requestRoute } = await import("./requestRoute.js");
    const response = await requestRoute({
      method: "GET",
      path: "bookclubsuite/presentation",
      version: "v1",
      serverUrl: "https://backend.peakub.com",
      redirectIfUserRequired: true,
    });

    expect(response.userIsInvalid).toBe(true);
    expect(response.error.message).toBe("user invalid");
    expect(mockOpenAccountRedirect).toHaveBeenCalledTimes(1);
  });
});
