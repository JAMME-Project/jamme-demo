import { describe, expect, it, vi } from 'vitest';
import raw from '../data/pocSteps.json';
import { stepsSchema } from '../domain/arStep';
import type { RuntimeConnection, RuntimeDriver, RuntimeEvents } from './ArRuntime';
import { LatestTaskQueue } from './LatestTaskQueue';
import { ManagedRuntime } from './ManagedRuntime';

const steps = stepsSchema.parse(raw);
const target = {} as HTMLCanvasElement;
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
function harness() {
  const connection: RuntimeConnection = {
    apply: vi.fn(async () => true),
    clear: vi.fn(async () => {}),
    stopCamera: vi.fn(),
    close: vi.fn(async () => {}),
  };
  const events: RuntimeEvents = { onPhase: vi.fn(), onError: vi.fn() };
  let callbacks!: RuntimeEvents;
  const driver: RuntimeDriver = {
    open: vi.fn(async (_target, _signal, handlers) => {
      callbacks = handlers;
      return connection;
    }),
  };
  const runtime = new ManagedRuntime(driver, events);
  return {
    connection,
    events,
    driver,
    runtime,
    get callbacks() {
      return callbacks;
    },
  };
}

describe('latest task queue', () => {
  it('serializes mutations and coalesces pending changes including guide toggles', async () => {
    const first = deferred<void>();
    const perform = vi.fn(async (value: number) => {
      if (value === 1) await first.promise;
    });
    const queue = new LatestTaskQueue(perform);
    const a = queue.submit(1);
    const b = queue.submit(2);
    const c = queue.submit(3);
    expect(perform).toHaveBeenCalledTimes(1);
    await expect(b).resolves.toBe('superseded');
    first.resolve();
    await expect(a).resolves.toBe('superseded');
    await expect(c).resolves.toBe('applied');
    expect(perform.mock.calls.map(([value]) => value)).toEqual([1, 3]);
  });
  it('accepts new work submitted immediately after a previous completion', async () => {
    const queue = new LatestTaskQueue(vi.fn(async () => {}));
    await expect(queue.submit(1)).resolves.toBe('applied');
    await expect(queue.submit(2)).resolves.toBe('applied');
  });
  it('discards an obsolete failure while allowing the final task to run', async () => {
    const first = deferred<void>();
    const queue = new LatestTaskQueue(async (n: number) => {
      if (n === 1) await first.promise;
    });
    const a = queue.submit(1);
    const b = queue.submit(2);
    first.reject(new Error('obsolete failure'));
    await expect(a).resolves.toBe('superseded');
    await expect(b).resolves.toBe('applied');
  });
});

describe('managed lifecycle', () => {
  it('deduplicates initialization and closes an active connection exactly once', async () => {
    const h = harness();
    const a = h.runtime.start(target);
    expect(h.runtime.start(target)).toBe(a);
    await a;
    await Promise.all([h.runtime.stop(), h.runtime.stop()]);
    expect(h.driver.open).toHaveBeenCalledTimes(1);
    expect(h.connection.close).toHaveBeenCalledTimes(1);
  });
  it('cleans up a connection that arrives after stopping during initialization', async () => {
    const h = harness();
    const late = deferred<RuntimeConnection>();
    vi.mocked(h.driver.open).mockReturnValue(late.promise);
    const start = h.runtime.start(target);
    const rejection = expect(start).rejects.toMatchObject({ name: 'AbortError' });
    const stop = h.runtime.stop();
    late.resolve(h.connection);
    await rejection;
    await stop;
    expect(h.connection.stopCamera).toHaveBeenCalled();
    expect(h.connection.close).toHaveBeenCalledTimes(1);
    expect(h.connection.apply).not.toHaveBeenCalled();
  });
  it('stops the camera immediately while SDK work is still pending and cancels queued work', async () => {
    const h = harness();
    const pending = deferred<boolean>();
    vi.mocked(h.connection.apply).mockReturnValueOnce(pending.promise);
    await h.runtime.start(target);
    const a = h.runtime.applyStep(steps[0], true);
    const b = h.runtime.applyStep(steps[1], false);
    const stop = h.runtime.stop();
    expect(h.connection.stopCamera).toHaveBeenCalledTimes(1);
    await expect(b).resolves.toMatchObject({ status: 'superseded' });
    expect(h.connection.close).not.toHaveBeenCalled();
    pending.resolve(true);
    await expect(a).resolves.toMatchObject({ status: 'superseded' });
    await stop;
    expect(h.connection.close).toHaveBeenCalledTimes(1);
    expect(h.connection.apply).toHaveBeenCalledTimes(1);
  });
  it('rejects false SDK results and never reports them as applied', async () => {
    const h = harness();
    vi.mocked(h.connection.apply).mockResolvedValueOnce(false);
    await h.runtime.start(target);
    await expect(h.runtime.applyStep(steps[0], true)).rejects.toMatchObject({
      code: 'not-applied',
    });
    await h.runtime.stop();
  });
  it('removes previous effects for valid unsupported templates', async () => {
    const h = harness();
    await h.runtime.start(target);
    const unknown = structuredClone(steps[0]);
    unknown.lens.launch_params.template_id = 'BLUSH_FUTURE';
    await expect(h.runtime.applyStep(unknown, true)).resolves.toMatchObject({
      status: 'unsupported',
    });
    expect(h.connection.clear).toHaveBeenCalledTimes(1);
    expect(h.connection.apply).not.toHaveBeenCalled();
    await h.runtime.stop();
  });
  it('invalidates pending results and releases resources on asynchronous rendering errors', async () => {
    const h = harness();
    await h.runtime.start(target);
    const pending = deferred<boolean>();
    vi.mocked(h.connection.apply).mockReturnValueOnce(pending.promise);
    const result = h.runtime.applyStep(steps[0], true);
    h.callbacks.onError(new Error('rendering failure'));
    expect(h.events.onError).toHaveBeenCalledTimes(1);
    expect(h.connection.stopCamera).toHaveBeenCalled();
    pending.resolve(true);
    await expect(result).resolves.toMatchObject({ status: 'superseded' });
    await h.runtime.stop();
    expect(h.connection.close).toHaveBeenCalledTimes(1);
  });
  it('starts a new generation while a cancelled old start is resolving', async () => {
    const h = harness();
    const late = deferred<RuntimeConnection>();
    vi.mocked(h.driver.open).mockReturnValueOnce(late.promise);
    const oldStart = h.runtime.start(target);
    const rejected = expect(oldStart).rejects.toMatchObject({ name: 'AbortError' });
    const oldStop = h.runtime.stop();
    await h.runtime.start(target);
    const oldConnection = { ...h.connection, close: vi.fn(async () => {}) };
    late.resolve(oldConnection);
    await rejected;
    await oldStop;
    await expect(h.runtime.applyStep(steps[0], true)).resolves.toMatchObject({ status: 'applied' });
    await h.runtime.stop();
  });
});
