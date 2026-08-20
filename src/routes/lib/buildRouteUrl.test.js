import { jest } from "@jest/globals";

describe("buildRouteUrl", () => {
  const originalEnv = process.env;
  const originalWindowEnv = global.window?.__env;
  const originalServable = global.Servable;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
    };
    if (global.window) {
      delete global.window.__env;
    }
    delete global.Servable;
  });

  afterAll(() => {
    process.env = originalEnv;
    if (global.window) {
      global.window.__env = originalWindowEnv;
    }
    global.Servable = originalServable;
  });

  test("resolves backend URL from runtime window env", async () => {
    global.window.__env = {
      NEXT_PUBLIC_SERVABLE_BACKEND_URL: "https://backend.peakub.com/",
    };

    const { default: buildRouteUrl, resolveServerUrl } = await import(
      "./buildRouteUrl.js"
    );

    expect(resolveServerUrl()).toBe("https://backend.peakub.com");
    expect(
      buildRouteUrl({ version: "v1", path: "/bookclubsuite/presentation" }),
    ).toBe("https://backend.peakub.com/v1/bookclubsuite/presentation");
  });

  test("falls back to relative route when no backend URL is available", async () => {
    const { default: buildRouteUrl } = await import("./buildRouteUrl.js");

    expect(buildRouteUrl({ version: "v2", path: "/resource/list/" })).toBe(
      "/v2/resource/list",
    );
  });

  test("uses global Servable serverUrl when runtime env is absent", async () => {
    global.Servable = {
      serverUrl: "https://fallback.peakub.com/",
    };

    const { resolveServerUrl } = await import("./buildRouteUrl.js");

    expect(resolveServerUrl()).toBe("https://fallback.peakub.com");
  });
});
