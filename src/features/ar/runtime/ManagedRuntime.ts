import { buildLaunchParams, type ArStep } from '../domain/arStep';
import { supportsStep } from '../domain/lensCapabilities';
import {
  ArError,
  type ApplyResult,
  type ArRuntime,
  type RuntimeConnection,
  type RuntimeDriver,
  type RuntimeEvents,
} from './ArRuntime';
import { LatestTaskQueue } from './LatestTaskQueue';

type Scope = {
  abort: AbortController;
  connection?: RuntimeConnection;
  start: Promise<void>;
  queue: LatestTaskQueue<{ step: ArStep; guideOn: boolean }>;
  close?: Promise<void>;
  failed: boolean;
};

export class ManagedRuntime implements ArRuntime {
  private scope?: Scope;
  private sequence = 0;
  constructor(
    private readonly driver: RuntimeDriver,
    private readonly events: RuntimeEvents,
  ) {}

  start(target: HTMLCanvasElement): Promise<void> {
    if (this.scope) return this.scope.start;
    const scope: Scope = {
      abort: new AbortController(),
      failed: false,
      start: Promise.resolve(),
      queue: new LatestTaskQueue(async ({ step, guideOn }) => {
        const connection = scope.connection;
        if (!connection || scope.abort.signal.aborted || scope.failed)
          throw new ArError('stopped', '카메라를 다시 시작해 주세요.');
        if (!supportsStep(step)) {
          await connection.clear();
          return;
        }
        const applied = await connection.apply(buildLaunchParams(step, guideOn));
        if (!applied)
          throw new ArError('not-applied', '렌즈를 적용하지 못했어요. 다시 시도해 주세요.');
        if (scope.failed)
          throw new ArError(
            'lens-execution',
            '렌즈 실행이 중단됐어요. 설정을 확인하고 다시 시작해 주세요.',
          );
      }),
    };
    this.scope = scope;
    scope.start = this.driver
      .open(target, scope.abort.signal, {
        onPhase: (phase) => {
          if (this.scope === scope && !scope.abort.signal.aborted) this.events.onPhase(phase);
        },
        onError: (error) => {
          if (this.scope !== scope || scope.abort.signal.aborted) return;
          scope.failed = true;
          scope.queue.invalidate();
          scope.connection?.stopCamera();
          this.events.onError(error);
          void this.closeScope(scope).catch(() => undefined);
        },
      })
      .then(async (connection) => {
        if (scope.abort.signal.aborted || scope.failed) {
          connection.stopCamera();
          await connection.close();
          throw new DOMException('Stopped', 'AbortError');
        }
        scope.connection = connection;
      })
      .catch((error: unknown) => {
        if (this.scope === scope) this.scope = undefined;
        throw error;
      });
    return scope.start;
  }

  async applyStep(step: ArStep, guideOn: boolean): Promise<ApplyResult> {
    const requestId = ++this.sequence;
    const scope = this.scope;
    if (!scope || scope.abort.signal.aborted || scope.failed)
      throw new ArError('not-started', '카메라를 먼저 시작해 주세요.');
    const status = await scope.queue.submit({ step, guideOn });
    return {
      requestId,
      status: status === 'applied' && !supportsStep(step) ? 'unsupported' : status,
    };
  }

  async stop(): Promise<void> {
    const scope = this.scope;
    this.scope = undefined;
    if (scope) await this.closeScope(scope);
  }

  private closeScope(scope: Scope): Promise<void> {
    if (scope.close) return scope.close;
    scope.abort.abort();
    scope.queue.invalidate();
    scope.connection?.stopCamera();
    scope.close = (async () => {
      await scope.start.catch(() => undefined);
      await scope.queue.idle();
      await scope.connection?.close();
    })();
    return scope.close;
  }
}
