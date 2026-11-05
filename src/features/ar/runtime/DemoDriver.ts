import type { RuntimeDriver, RuntimeConnection, RuntimeEvents } from './ArRuntime';

/** No camera, SDK download, face tracking or network requests. */
export class DemoDriver implements RuntimeDriver {
  async open(
    _target: HTMLCanvasElement,
    signal: AbortSignal,
    events: RuntimeEvents,
  ): Promise<RuntimeConnection> {
    signal.throwIfAborted();
    events.onPhase('lens');
    return {
      apply: async () => {
        signal.throwIfAborted();
        return true;
      },
      clear: async () => {},
      stopCamera: () => {},
      close: async () => {},
    };
  }
}
