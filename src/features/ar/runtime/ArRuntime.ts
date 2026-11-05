import type { ArStep, LaunchParams } from '../domain/arStep';

export type ApplyResult = { status: 'applied' | 'superseded' | 'unsupported'; requestId: number };
export type RuntimePhase = 'permission' | 'sdk' | 'lens';
export type RuntimeEvents = {
  onError: (error: Error) => void;
  onPhase: (phase: RuntimePhase) => void;
};
export interface ArRuntime {
  start(target: HTMLCanvasElement): Promise<void>;
  applyStep(step: ArStep, guideOn: boolean): Promise<ApplyResult>;
  stop(): Promise<void>;
}

export interface RuntimeConnection {
  apply(params: LaunchParams): Promise<boolean>;
  clear(): Promise<void>;
  stopCamera(): void;
  close(): Promise<void>;
}
export interface RuntimeDriver {
  open(
    target: HTMLCanvasElement,
    signal: AbortSignal,
    events: RuntimeEvents,
  ): Promise<RuntimeConnection>;
}

export class ArError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ArError';
  }
}
export function toUserMessage(error: unknown): string {
  if (error instanceof ArError) return error.message;
  if (error instanceof Error) {
    switch (error.name) {
      case 'NotAllowedError':
      case 'SecurityError':
        return '카메라 권한이 필요해요. 브라우저 또는 앱 설정에서 카메라를 허용한 뒤 다시 시작해 주세요.';
      case 'NotFoundError':
        return '사용할 수 있는 카메라를 찾지 못했어요. 카메라가 연결된 기기에서 다시 열어 주세요.';
      case 'NotReadableError':
        return '다른 앱이 카메라를 사용 중이거나 카메라를 열 수 없어요. 사용 중인 앱을 닫고 다시 시도해 주세요.';
      case 'OverconstrainedError':
        return '카메라 설정을 사용할 수 없어요. 다른 브라우저에서 다시 시도해 주세요.';
    }
  }
  return 'AR을 준비하지 못했어요. 네트워크와 렌즈 설정을 확인한 뒤 다시 시도해 주세요.';
}
