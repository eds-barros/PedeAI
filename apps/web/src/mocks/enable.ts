let starting: Promise<void> | null = null;

export function ensureMock() {
  if (typeof window === "undefined") return Promise.resolve();
  if (!starting) {
    starting = import("@/mocks/browser")
      .then(({ worker }) => worker.start({ onUnhandledFrame: "bypass" }))
      .then(() => undefined)
      .catch((error: unknown) => {
        starting = null;
        throw error;
      });
  }
  return starting;
}
