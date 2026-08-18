import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockConfig, sentryMock } = vi.hoisted(() => ({
  mockConfig: {
    sentryDsn: "",
    nodeEnv: "test",
  },
  sentryMock: {
    init: vi.fn(),
    captureException: vi.fn(),
    withScope: vi.fn(),
  },
}));

vi.mock("@sentry/node", () => sentryMock);

vi.mock("../../config", () => ({
  config: mockConfig,
}));

import { captureException as captureTrackedException, initErrorTracking } from "./error-tracking";

describe("error tracking", () => {
  beforeEach(() => {
    sentryMock.init.mockReset();
    sentryMock.captureException.mockReset();
    sentryMock.withScope.mockReset();
    mockConfig.sentryDsn = "";
    mockConfig.nodeEnv = "test";
  });

  it("does not initialize Sentry when no DSN is configured", () => {
    initErrorTracking();
    expect(sentryMock.init).not.toHaveBeenCalled();
  });

  it("captures exceptions when Sentry is configured", () => {
    mockConfig.sentryDsn = "https://example@sentry.io/1";
    mockConfig.nodeEnv = "development";
    sentryMock.withScope.mockImplementation((callback: (scope: { setContext: (name: string, context: Record<string, unknown>) => void }) => void) => callback({ setContext: vi.fn() }));
    const error = new Error("boom");

    captureTrackedException(error, { requestId: "req-1" });

    expect(sentryMock.captureException).toHaveBeenCalledWith(error);
  });
});
