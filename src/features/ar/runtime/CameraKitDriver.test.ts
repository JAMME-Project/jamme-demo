import { describe, expect, it, vi } from 'vitest';
import { CameraKitDriver } from './CameraKitDriver';
import { toUserMessage, type RuntimeEvents } from './ArRuntime';
import raw from '../data/pocSteps.json';
import { buildLaunchParams, stepsSchema } from '../domain/arStep';

type SDK = typeof import('@snap/camera-kit');
const config = {
  apiToken: 'test-public-sdk-token',
  lensId: 'test-lens',
  lensGroupId: 'test-group',
};
const target = {} as HTMLCanvasElement;
function harness() {
  const track = { stop: vi.fn() };
  const stream = { getTracks: () => [track] } as unknown as MediaStream;
  const session = {
    events: { addEventListener: vi.fn(), removeEventListener: vi.fn() },
    applyLens: vi.fn(async () => true),
    play: vi.fn(async () => {}),
    pause: vi.fn(async () => {}),
    removeLens: vi.fn(async () => true),
    setSource: vi.fn(async () => {}),
  };
  const lens = { id: 'test-lens' };
  const kit = {
    createSession: vi.fn(async () => session),
    destroy: vi.fn(async () => {}),
    lensRepository: { loadLens: vi.fn(async () => lens) },
  };
  const sdk = {
    bootstrapCameraKit: vi.fn(async () => kit),
    createMediaStreamSource: vi.fn(() => ({})),
    Transform2D: { MirrorX: 'mirror' },
  } as unknown as SDK;
  const deps = {
    getUserMedia: vi.fn(async () => stream),
    loadSdk: vi.fn(async () => sdk),
    isSecure: () => true,
  };
  const events: RuntimeEvents = { onError: vi.fn(), onPhase: vi.fn() };
  return {
    track,
    stream,
    session,
    kit,
    sdk,
    deps,
    events,
    lens,
    driver: new CameraKitDriver(config, deps),
  };
}
describe('Camera Kit adapter with simulated SDK and media', () => {
  it('does not send makeup parameters to a generic sample lens', async () => {
    const h = harness();
    const driver = new CameraKitDriver({ ...config, sampleLens: true }, h.deps);
    const connection = await driver.open(target, new AbortController().signal, h.events);
    await connection.apply(buildLaunchParams(stepsSchema.parse(raw)[0], true));
    expect(h.session.applyLens).toHaveBeenCalledWith(h.lens, undefined);
    await connection.close();
  });
  it('cleans up media when SDK download fails', async () => {
    const h = harness();
    h.deps.loadSdk.mockRejectedValueOnce(new Error('download failed'));
    await expect(h.driver.open(target, new AbortController().signal, h.events)).rejects.toThrow(
      'download failed',
    );
    expect(h.track.stop).toHaveBeenCalled();
    expect(h.kit.createSession).not.toHaveBeenCalled();
  });
  it('cleans up an SDK session that finishes creating after cancellation', async () => {
    const h = harness();
    const abort = new AbortController();
    let created!: (session: typeof h.session) => void;
    h.kit.createSession.mockReturnValueOnce(
      new Promise((resolve) => {
        created = resolve;
      }),
    );
    const opening = h.driver.open(target, abort.signal, h.events);
    const rejected = expect(opening).rejects.toMatchObject({ name: 'AbortError' });
    await vi.waitFor(() => expect(h.kit.createSession).toHaveBeenCalled());
    abort.abort();
    expect(h.track.stop).toHaveBeenCalled();
    created(h.session);
    await rejected;
    expect(h.kit.destroy).toHaveBeenCalledTimes(1);
    expect(h.session.setSource).not.toHaveBeenCalled();
  });
  it('preserves permission-denial guidance without exposing raw SDK errors', async () => {
    const h = harness();
    const denied = new DOMException('private error detail', 'NotAllowedError');
    h.deps.getUserMedia.mockRejectedValueOnce(denied);
    await expect(h.driver.open(target, new AbortController().signal, h.events)).rejects.toBe(
      denied,
    );
    expect(toUserMessage(denied)).toContain('카메라 권한');
    expect(toUserMessage(new Error(config.apiToken))).not.toContain(config.apiToken);
    expect(h.deps.loadSdk).not.toHaveBeenCalled();
  });
  it('stops media arriving after permission is granted to a cancelled request', async () => {
    const h = harness();
    const abort = new AbortController();
    let grant!: (stream: MediaStream) => void;
    h.deps.getUserMedia.mockReturnValue(
      new Promise((resolve) => {
        grant = resolve;
      }),
    );
    const opening = h.driver.open(target, abort.signal, h.events);
    const rejected = expect(opening).rejects.toMatchObject({ name: 'AbortError' });
    abort.abort();
    grant(h.stream);
    await rejected;
    expect(h.track.stop).toHaveBeenCalled();
    expect(h.deps.loadSdk).not.toHaveBeenCalled();
  });
  it('cleans up media and kit on lens loading failure', async () => {
    const h = harness();
    h.kit.lensRepository.loadLens.mockRejectedValue(new Error('lens unavailable'));
    await expect(h.driver.open(target, new AbortController().signal, h.events)).rejects.toThrow(
      'lens unavailable',
    );
    expect(h.track.stop).toHaveBeenCalled();
    expect(h.kit.destroy).toHaveBeenCalledTimes(1);
    expect(h.session.events.removeEventListener).toHaveBeenCalledTimes(1);
  });
  it('uses the installed launchParams shape, mirrors once, and releases only once', async () => {
    const h = harness();
    const abort = new AbortController();
    const connection = await h.driver.open(target, abort.signal, h.events);
    const params = buildLaunchParams(stepsSchema.parse(raw)[0], false);
    await expect(connection.apply(params)).resolves.toBe(true);
    expect(h.session.applyLens).toHaveBeenCalledWith(h.lens, { launchParams: params });
    expect(h.sdk.createMediaStreamSource).toHaveBeenCalledWith(
      h.stream,
      expect.objectContaining({ cameraType: 'user', transform: 'mirror', fpsLimit: 30 }),
    );
    await Promise.all([connection.close(), connection.close()]);
    expect(h.kit.destroy).toHaveBeenCalledTimes(1);
    expect(h.session.events.removeEventListener).toHaveBeenCalledTimes(1);
  });
  it('does not start rendering after applyLens resolves false', async () => {
    const h = harness();
    const connection = await h.driver.open(target, new AbortController().signal, h.events);
    h.session.applyLens.mockResolvedValueOnce(false);
    await expect(
      connection.apply(buildLaunchParams(stepsSchema.parse(raw)[0], true)),
    ).resolves.toBe(false);
    expect(h.session.play).not.toHaveBeenCalled();
    await connection.close();
  });
  it('prevents insecure-origin camera requests', async () => {
    const h = harness();
    const driver = new CameraKitDriver(config, { ...h.deps, isSecure: () => false });
    await expect(driver.open(target, new AbortController().signal, h.events)).rejects.toMatchObject(
      { code: 'insecure' },
    );
    expect(h.deps.getUserMedia).not.toHaveBeenCalled();
  });
});
