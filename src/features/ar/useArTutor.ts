import { useCallback, useEffect, useRef, useState } from 'react';
import { readConfig } from '../../config/env';
import rawSteps from './data/pocSteps.json';
import { stepsSchema } from './domain/arStep';
import { ArError, toUserMessage, type ArRuntime, type RuntimePhase } from './runtime/ArRuntime';
import { CameraKitDriver } from './runtime/CameraKitDriver';
import { DemoDriver } from './runtime/DemoDriver';
import { ManagedRuntime } from './runtime/ManagedRuntime';

const parsed = stepsSchema.safeParse(rawSteps);
export const steps = parsed.success ? parsed.data : [];
export type Mode = 'demo' | 'camera';
type Phase = 'idle' | 'starting' | 'applying' | 'running' | 'suspended' | 'complete' | 'error';
type State = {
  phase: Phase;
  mode: Mode;
  selected: number;
  applied: number | null;
  guideOn: boolean;
  appliedGuideOn: boolean;
  unsupported: boolean;
  error: string | null;
  loading: RuntimePhase;
};
const initial: State = {
  phase: 'idle',
  mode: 'demo',
  selected: 0,
  applied: null,
  guideOn: true,
  appliedGuideOn: true,
  unsupported: false,
  error: null,
  loading: 'permission',
};

export function useArTutor() {
  const [state, setState] = useState<State>(initial);
  const stateRef = useRef(state);
  const viewportRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<ArRuntime | null>(null);
  const intent = useRef(0);
  const mounted = useRef(true);
  const config = readConfig();

  const update = useCallback((patch: Partial<State>) => {
    stateRef.current = { ...stateRef.current, ...patch };
    if (mounted.current) setState(stateRef.current);
  }, []);

  const stop = useCallback(
    (phase: Phase = 'idle') => {
      intent.current++;
      const runtime = runtimeRef.current;
      runtimeRef.current = null;
      void runtime?.stop().catch(() => undefined);
      update({ phase, applied: null, error: null, unsupported: false });
    },
    [update],
  );

  const fail = useCallback(
    (error: unknown) => {
      intent.current++;
      const runtime = runtimeRef.current;
      runtimeRef.current = null;
      void runtime?.stop().catch(() => undefined);
      update({ phase: 'error', error: toUserMessage(error), applied: null });
    },
    [update],
  );

  const apply = useCallback(
    async (index: number, guideOn: boolean) => {
      const runtime = runtimeRef.current;
      const step = steps[index];
      if (!runtime || !step) return;
      const id = ++intent.current;
      update({ phase: 'applying', selected: index, guideOn, error: null });
      try {
        const result = await runtime.applyStep(step, guideOn);
        if (id !== intent.current || runtime !== runtimeRef.current) return;
        if (result.status === 'superseded')
          throw new ArError('superseded', '적용이 중단됐어요. 다시 시작해 주세요.');
        update({
          phase: 'running',
          applied: index,
          appliedGuideOn: guideOn,
          unsupported: result.status === 'unsupported',
        });
      } catch (error) {
        if (id === intent.current && runtime === runtimeRef.current) fail(error);
      }
    },
    [fail, update],
  );

  const start = useCallback(
    async (mode: Mode) => {
      if (stateRef.current.phase === 'starting') return;
      if (!parsed.success) {
        fail(
          new ArError(
            'invalid-steps',
            '단계 데이터를 읽지 못했어요. 새로고침 후 다시 시도해 주세요.',
          ),
        );
        return;
      }
      if (mode === 'camera' && !config.config) {
        fail(
          new ArError(
            'missing-config',
            '실제 AR 연결 설정이 아직 준비되지 않았어요. 데모로 먼저 살펴볼 수 있어요.',
          ),
        );
        return;
      }
      const host = viewportRef.current;
      if (!host) return;
      const selected = stateRef.current.phase === 'complete' ? 0 : stateRef.current.selected;
      stop();
      const id = ++intent.current;
      const canvas = document.createElement('canvas');
      canvas.setAttribute('aria-label', '카메라 AR 영상');
      host.replaceChildren(canvas);
      const runtime = new ManagedRuntime(
        mode === 'demo' ? new DemoDriver() : new CameraKitDriver(config.config!),
        {
          onPhase: (loading) => {
            if (runtimeRef.current === runtime) update({ loading });
          },
          onError: (error) => {
            if (runtimeRef.current === runtime) fail(error);
          },
        },
      );
      runtimeRef.current = runtime;
      update({
        phase: 'starting',
        mode,
        selected,
        applied: null,
        error: null,
        loading: 'permission',
      });
      try {
        await runtime.start(canvas);
        if (id !== intent.current || runtimeRef.current !== runtime) return;
        await apply(selected, stateRef.current.guideOn);
      } catch (error) {
        if (id === intent.current && runtimeRef.current === runtime) fail(error);
      }
    },
    [apply, config.config, fail, stop, update],
  );

  const select = (index: number) => {
    if (index < 0 || index >= steps.length || stateRef.current.phase === 'starting') return;
    if (runtimeRef.current) void apply(index, stateRef.current.guideOn);
    else update({ selected: index });
  };
  const toggleGuide = () => {
    if (stateRef.current.phase === 'starting') return;
    const next = !stateRef.current.guideOn;
    if (runtimeRef.current) void apply(stateRef.current.selected, next);
    else update({ guideOn: next });
  };

  useEffect(() => {
    mounted.current = true;
    const suspend = () => {
      if (runtimeRef.current) stop('suspended');
    };
    const visibility = () => {
      if (document.visibilityState === 'hidden') suspend();
    };
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pagehide', suspend);
    return () => {
      mounted.current = false;
      intent.current++;
      const runtime = runtimeRef.current;
      runtimeRef.current = null;
      void runtime?.stop().catch(() => undefined);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pagehide', suspend);
    };
  }, [stop]);

  return {
    state,
    steps,
    viewportRef,
    config,
    start,
    stop,
    select,
    toggleGuide,
    complete: () => stop('complete'),
  };
}
