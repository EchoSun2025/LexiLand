export function createBrowserBridge() {
  const listeners = new Set();

  return {
    kind: 'browser-mock',
    platform:
      navigator.userAgentData?.platform ||
      navigator.platform ||
      'browser',
    supportsGlobalCapture: false,
    async requestPermissions() {
      return {
        accessibility: false,
        screenCapture: false,
        ocr: false,
      };
    },
    subscribe(handler) {
      listeners.add(handler);
      return () => listeners.delete(handler);
    },
    emitMockCapture(payload) {
      listeners.forEach((listener) => listener(payload));
    },
  };
}
