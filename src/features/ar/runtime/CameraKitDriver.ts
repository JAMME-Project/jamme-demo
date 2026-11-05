import type { CameraKit, CameraKitSession } from '@snap/camera-kit';
import type { CameraKitConfig } from '../../../config/env';
import {
  ArError,
  type RuntimeConnection,
  type RuntimeDriver,
  type RuntimeEvents,
} from './ArRuntime';

type SDK = typeof import('@snap/camera-kit');
type Dependencies = {
  getUserMedia: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
  loadSdk: () => Promise<SDK>;
  isSecure: () => boolean;
};

export class CameraKitDriver implements RuntimeDriver {
  constructor(
    private readonly config: CameraKitConfig,
    private readonly deps: Dependencies = {
      getUserMedia: (constraints) => {
        if (!navigator.mediaDevices?.getUserMedia)
          throw new ArError(
            'no-camera-api',
            '이 환경에서는 카메라를 사용할 수 없어요. HTTPS 주소 또는 지원 브라우저로 열어 주세요.',
          );
        return navigator.mediaDevices.getUserMedia(constraints);
      },
      loadSdk: () => import('@snap/camera-kit'),
      isSecure: () => window.isSecureContext,
    },
  ) {}

  async open(
    target: HTMLCanvasElement,
    signal: AbortSignal,
    events: RuntimeEvents,
  ): Promise<RuntimeConnection> {
    if (!this.deps.isSecure())
      throw new ArError(
        'insecure',
        '카메라는 HTTPS 주소 또는 이 기기의 localhost에서 사용할 수 있어요.',
      );
    const check = () => signal.throwIfAborted();
    check();
    events.onPhase('permission');
    const stream = await this.deps.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: 'user' },
        width: { ideal: 720 },
        height: { ideal: 960 },
        frameRate: { ideal: 30, max: 30 },
      },
    });
    const stopCamera = () => stream.getTracks().forEach((track) => track.stop());
    signal.addEventListener('abort', stopCamera, { once: true });
    let kit: CameraKit | undefined;
    let session: CameraKitSession | undefined;
    let closePromise: Promise<void> | undefined;
    let removeErrorListener = () => {};
    const close = () =>
      (closePromise ??= (async () => {
        stopCamera();
        signal.removeEventListener('abort', stopCamera);
        removeErrorListener();
        // CameraKit.destroy owns all sessions created by this instance.
        await kit?.destroy();
      })());

    try {
      check();
      events.onPhase('sdk');
      const sdk = await this.deps.loadSdk();
      check();
      kit = await sdk.bootstrapCameraKit({ apiToken: this.config.apiToken });
      check();
      session = await kit.createSession({ liveRenderTarget: target });
      check();
      const onError = () =>
        events.onError(
          new ArError(
            'lens-execution',
            '렌즈 실행이 중단됐어요. 렌즈 설정을 확인하고 다시 시작해 주세요.',
          ),
        );
      session.events.addEventListener('error', onError);
      removeErrorListener = () => session?.events.removeEventListener('error', onError);
      const source = sdk.createMediaStreamSource(stream, {
        transform: sdk.Transform2D.MirrorX,
        cameraType: 'user',
        fpsLimit: 30,
      });
      await session.setSource(source);
      check();
      events.onPhase('lens');
      const lens = await kit.lensRepository.loadLens(this.config.lensId, this.config.lensGroupId);
      check();
      const liveSession = session;
      return {
        apply: async (params) => {
          check();
          const applied = await liveSession.applyLens(
            lens,
            this.config.sampleLens ? undefined : { launchParams: params },
          );
          check();
          if (applied) {
            await liveSession.play();
            check();
          }
          return applied;
        },
        clear: async () => {
          check();
          await liveSession.pause();
          await liveSession.removeLens();
        },
        stopCamera,
        close,
      };
    } catch (error) {
      await close().catch(() => undefined);
      throw error;
    }
  }
}
