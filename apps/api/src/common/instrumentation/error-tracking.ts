import * as Sentry from "@sentry/node";
import { config } from "../../config";

export function initErrorTracking() {
  if (!config.sentryDsn || config.nodeEnv === "test") {
    return;
  }

  Sentry.init({
    dsn: config.sentryDsn,
    environment: config.nodeEnv,
    tracesSampleRate: 1.0,
    enabled: true,
  });
}

export function captureException(err: unknown, context?: Record<string, unknown>) {
  if (!config.sentryDsn || config.nodeEnv === "test") {
    return;
  }

  Sentry.withScope((scope: { setContext: (name: string, context: Record<string, unknown>) => void }) => {
    if (context) {
      scope.setContext("context", context);
    }
    Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
  });
}
