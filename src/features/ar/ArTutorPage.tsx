import { useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Code2,
  Copy,
  Focus,
  Layers,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Video,
  X,
} from 'lucide-react';
import { useArTutor } from './useArTutor';
import { FacePreview } from './components/FacePreview';
import { buildLaunchParams } from './domain/arStep';

const descriptions = [
  '볼에 가볍게 색을 더해요',
  '같은 위치, 조금 더 선명하게',
  '피치 컬러로 부드럽게 마무리',
];
const loadingLabels = {
  permission: '카메라 권한을 확인하고 있어요',
  sdk: 'AR 스튜디오를 준비하고 있어요',
  lens: '볼 효과를 불러오고 있어요',
};

export function ArTutorPage() {
  const tutor = useArTutor();
  const { state, steps, viewportRef, config, start, stop, select, toggleGuide, complete } = tutor;
  const [help, setHelp] = useState(false);
  const [copyStatus, setCopyStatus] = useState('');
  const step = steps[state.applied ?? state.selected];
  if (!step)
    return (
      <main className="fatal-error">
        <h1>단계 데이터를 준비하지 못했어요.</h1>
        <p>페이지를 새로고침해 주세요.</p>
      </main>
    );
  const active = ['starting', 'applying', 'running'].includes(state.phase);
  const applying = state.phase === 'applying';
  const running = state.phase === 'running';
  const isDemo = state.mode === 'demo';
  const sampleCamera = !isDemo && config.config?.sampleLens;
  const preview = state.phase === 'idle' || !active || isDemo;
  const params = step.lens.launch_params;
  const initialPreview = state.phase === 'idle' || state.phase === 'complete';
  const guideOn = initialPreview
    ? false
    : state.applied === null
      ? state.guideOn
      : state.appliedGuideOn;
  const debug = {
    ...step,
    lens: { ...step.lens, launch_params: buildLaunchParams(step, state.guideOn) },
  };

  async function copyJson() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(debug, null, 2));
      setCopyStatus('복사했어요');
    } catch {
      setCopyStatus('복사할 수 없어요. 아래 내용을 직접 선택해 주세요.');
    }
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="wordmark" href="/" aria-label="JAMME 처음으로">
          jamme<span>✳</span>
        </a>
        <div className="header-divider" />
        <span className="studio-label">MAKEUP STUDIO</span>
        <button
          className={`help-button ${help ? 'is-open' : ''}`}
          aria-expanded={help}
          aria-controls="help-panel"
          onClick={() => setHelp(!help)}
        >
          <CircleHelp size={17} />
          <span>이용 안내</span>
        </button>
      </header>

      {help && (
        <aside id="help-panel" className="help-panel">
          <div>
            <strong>내 얼굴에, 한 단계씩.</strong>
            <p>
              데모는 카메라 없이 일러스트로 효과를 살펴봐요. 실제 AR은 카메라 권한과 렌즈 연결
              설정이 필요하며, 현재 단계의 효과만 표시해요. 다른 화면으로 이동하면 카메라를
              종료해요.
            </p>
          </div>
          <button
            className="icon-button"
            aria-label="이용 안내 닫기"
            onClick={() => setHelp(false)}
          >
            <X size={19} />
          </button>
        </aside>
      )}

      <main className="workspace">
        <section className="lesson-sidebar" aria-label="메이크업 연습 단계">
          <div className="lesson-intro">
            <div className="eyebrow">
              <span className="small-line" /> A LITTLE PRACTICE, A LITTLE GLOW
            </div>
            <h1>
              조금씩,
              <br /> 나답게<span className="title-period">.</span>
            </h1>
            <p className="intro-copy">
              어려웠던 메이크업도 한 단계씩.
              <br /> 내 얼굴 위에서 가볍게 연습해 보세요.
            </p>
          </div>

          <div className="lesson-card">
            <div className="lesson-card-heading">
              <div className="lesson-symbol">
                <Sparkles size={21} strokeWidth={1.5} />
              </div>
              <div>
                <span className="overline">TODAY’S PRACTICE</span>
                <h2>자연스럽게 물든 볼</h2>
              </div>
              <span className="lesson-pill">BASIC</span>
            </div>
            <div className="lesson-meta">
              <span>블러셔</span>
              <i />
              <span>3단계</span>
              <i />
              <span>고정 샘플 연습</span>
            </div>
            <ol className="step-list">
              {steps.map((item, index) => {
                const current = state.selected === index;
                const done = state.applied !== null && index < state.applied;
                return (
                  <li key={item.step_no}>
                    <button
                      className={`step-item ${current ? 'is-current' : ''}`}
                      onClick={() => select(index)}
                      disabled={state.phase === 'starting' || (active && sampleCamera)}
                      aria-current={current ? 'step' : undefined}
                      aria-label={`${index + 1}단계 ${item.title}`}
                    >
                      <span className={`step-number ${done ? 'is-done' : ''}`}>
                        {done ? <Check size={16} /> : `0${index + 1}`}
                      </span>
                      <span className="step-copy">
                        <strong>{item.title}</strong>
                        <span>{descriptions[index]}</span>
                      </span>
                      {current && <span className="current-dot" />}
                    </button>
                  </li>
                );
              })}
            </ol>
            <div className="lesson-card-note">
              <Layers size={14} />
              <span>한 번에 하나의 효과에 집중해요</span>
            </div>
          </div>

          <div className="practice-note">
            <span className="note-icon">
              <Focus size={21} strokeWidth={1.5} />
            </span>
            <div>
              <strong>정답보다, 나에게 맞는 감각</strong>
              <p>
                가이드를 켜고 위치를 살펴보세요.
                <br />
                익숙해지면 가이드 없이도 좋아요.
              </p>
            </div>
          </div>
          <div className="sidebar-foot">
            <span>01</span>
            <div />
            <span>YOUR BEAUTY, YOUR PACE</span>
          </div>
        </section>

        <section className="studio" aria-label="AR 메이크업 미리보기">
          <div className="studio-heading">
            <div>
              <span className="live-dot" />
              <span>{running && !isDemo ? '내 카메라' : '메이크업 미리보기'}</span>
            </div>
            <span className="stage-caption">
              BLUSH STUDIO <span>／</span> 01
            </span>
          </div>
          <div className={`camera-stage ${applying ? 'is-applying' : ''}`}>
            <div
              ref={viewportRef}
              className={`camera-output ${preview || !running || state.unsupported ? 'is-hidden' : ''}`}
            />
            {preview && (
              <FacePreview
                color={params.color_rgb}
                intensity={initialPreview ? 0.18 : params.intensity}
                softness={params.softness}
                guideOn={guideOn && active}
              />
            )}
            <div className="stage-topline">
              <span className="mode-badge">
                {active && isDemo ? (
                  <>
                    <span className="badge-dot" />
                    데모 · 실제 AR 아님
                  </>
                ) : active ? (
                  <>
                    <span className="badge-dot live" />
                    {sampleCamera ? '샘플 렌즈 · Face Landmarks' : '카메라 AR'}
                  </>
                ) : (
                  <>
                    <Sparkles size={12} />
                    ILLUSTRATION PREVIEW
                  </>
                )}
              </span>
              {active && (
                <button className="stage-close" onClick={() => stop()} aria-label="연습 종료">
                  <X size={18} />
                </button>
              )}
            </div>

            {state.phase === 'idle' && (
              <div className="start-overlay">
                <div className="preview-decoration">
                  <span />
                  MAKE ROOM FOR YOUR GLOW
                  <span />
                </div>
                <h2>오늘의 작은 변화</h2>
                <p>볼에 더하는 은은한 컬러부터 시작해요.</p>
                <button
                  className="primary-button start-button"
                  onClick={() => void start(config.config ? 'camera' : 'demo')}
                >
                  <Play size={16} fill="currentColor" />
                  {config.config ? '카메라로 시작' : '데모로 시작하기'}
                  <ArrowRight size={18} />
                </button>
                <span className="start-footnote">
                  {config.config
                    ? config.config.sampleLens
                      ? 'Face Landmarks 샘플 · 얼굴 추적 연결 테스트'
                      : '카메라 권한을 요청해요'
                    : '정적 일러스트 · 카메라를 사용하지 않아요'}
                </span>
                {config.config && (
                  <button className="text-button" onClick={() => void start('demo')}>
                    먼저 데모로 둘러보기 <ChevronRight size={14} />
                  </button>
                )}
              </div>
            )}

            {(state.phase === 'starting' || applying) && (
              <div className="status-overlay" role="status">
                <span className="loader" />
                <strong>
                  {applying
                    ? sampleCamera
                      ? '샘플 렌즈를 적용하고 있어요'
                      : '새로운 단계를 적용하고 있어요'
                    : state.loading === 'lens' && sampleCamera
                      ? '샘플 렌즈를 불러오고 있어요'
                      : loadingLabels[state.loading]}
                </strong>
                {state.phase === 'starting' && (
                  <button className="text-button" onClick={() => stop()}>
                    취소
                  </button>
                )}
              </div>
            )}
            {state.phase === 'error' && (
              <div className="status-overlay error-overlay" role="alert">
                <CircleHelp size={30} strokeWidth={1.5} />
                <strong>잠시, 준비가 필요해요</strong>
                <p>{state.error}</p>
                <button className="primary-button" onClick={() => void start(state.mode)}>
                  <RotateCcw size={16} />
                  다시 시도
                </button>
                <button className="text-button" onClick={() => stop()}>
                  시작 화면으로
                </button>
              </div>
            )}
            {state.phase === 'suspended' && (
              <div className="status-overlay">
                <Focus size={30} />
                <strong>연습을 잠시 멈췄어요</strong>
                <p>
                  화면을 벗어나 카메라를 종료했어요.
                  <br />
                  이어서 시작할 수 있어요.
                </p>
                <button className="primary-button" onClick={() => void start(state.mode)}>
                  <Play size={16} />
                  이어서 시작
                </button>
              </div>
            )}
            {state.phase === 'complete' && (
              <div className="status-overlay complete-overlay">
                <span className="complete-check">
                  <Check size={29} strokeWidth={1.4} />
                </span>
                <span className="overline">PRACTICE COMPLETE</span>
                <h2>오늘도, 한 걸음 더.</h2>
                <p>
                  볼 효과 연습을 마쳤어요.
                  <br />
                  다시 연습하며 차이를 느껴 보세요.
                </p>
                <button
                  className="primary-button"
                  onClick={() => {
                    select(0);
                    void start(state.mode);
                  }}
                >
                  <RotateCcw size={16} />
                  처음부터 다시
                </button>
                <button
                  className="text-button"
                  onClick={() => {
                    select(0);
                    stop();
                  }}
                >
                  시작 화면으로
                </button>
              </div>
            )}
            {running && state.unsupported && (
              <div className="status-overlay">
                <Layers size={28} />
                <strong>설명으로 따라 해 주세요</strong>
                <p>이 단계는 현재 렌즈가 지원하지 않아요.</p>
              </div>
            )}

            {running && !state.unsupported && (
              <>
                {isDemo && (
                  <div className="cheek-label">
                    <span className="label-line" />
                    <span>볼 중앙에 가볍게</span>
                  </div>
                )}
                <div className="stage-bottom-hint">
                  <Focus size={15} />
                  <span>
                    {isDemo
                      ? '고정 일러스트로 효과의 차이를 확인해요'
                      : '밝은 곳에서 얼굴이 정면으로 보이게 해 주세요'}
                  </span>
                </div>
              </>
            )}
            <span className="corner-mark top-left" />
            <span className="corner-mark top-right" />
            <span className="corner-mark bottom-left" />
            <span className="corner-mark bottom-right" />
          </div>

          {sampleCamera && state.phase !== 'idle' ? (
            <div className="studio-controls sample-controls">
              <div className="active-step">
                <div>
                  <h2>얼굴 추적 연결 테스트</h2>
                  <p>Snap의 Face Landmarks 샘플 렌즈예요. 얼굴을 움직이며 추적을 확인해 주세요.</p>
                  <p>볼 색상과 점선 가이드는 전용 메이크업 렌즈를 연결한 뒤 사용할 수 있어요.</p>
                </div>
              </div>
              <div className="navigation-buttons">
                <button className="secondary-button" onClick={() => stop()}>
                  카메라 종료
                </button>
              </div>
            </div>
          ) : (
            <div className="studio-controls">
              <div className="control-topline">
                <span className="step-count">
                  STEP <strong>{String(state.selected + 1).padStart(2, '0')}</strong>
                  <span>/ 03</span>
                </span>
                <div className="progress-track" aria-label={`${state.selected + 1} / 3단계`}>
                  {steps.map((_, i) => (
                    <span key={i} className={i <= state.selected ? 'filled' : ''} />
                  ))}
                </div>
                <button
                  className="guide-control"
                  role="switch"
                  aria-checked={state.guideOn}
                  disabled={state.phase === 'starting'}
                  onClick={toggleGuide}
                >
                  <span>점선 가이드</span>
                  <span className={`switch-track ${state.guideOn ? 'on' : ''}`}>
                    <span />
                  </span>
                </button>
              </div>
              <div className="active-step">
                <div>
                  <h2>{step.title}</h2>
                  <p>{step.ui.tip}</p>
                </div>
                <span
                  className="color-swatch"
                  style={{ backgroundColor: `rgb(${params.color_rgb.join(',')})` }}
                  aria-label="현재 볼 색상"
                />
              </div>
              <div className="navigation-buttons">
                <button
                  className="secondary-button previous-button"
                  onClick={() => select(state.selected - 1)}
                  disabled={state.selected === 0 || state.phase === 'starting'}
                >
                  <ArrowLeft size={17} />
                  이전
                </button>
                {active ? (
                  <button
                    className="primary-button next-button"
                    disabled={
                      state.phase === 'starting' ||
                      (applying && state.selected === steps.length - 1)
                    }
                    onClick={() =>
                      state.selected === steps.length - 1 ? complete() : select(state.selected + 1)
                    }
                  >
                    {state.selected === steps.length - 1 ? '연습 마치기' : '다음 단계'}
                    {state.selected === steps.length - 1 ? (
                      <Check size={18} />
                    ) : (
                      <ArrowRight size={18} />
                    )}
                  </button>
                ) : (
                  <button
                    className="primary-button next-button"
                    onClick={() => void start(config.config ? 'camera' : 'demo')}
                  >
                    {state.phase === 'idle' ? '연습 시작' : '다시 시작'}
                    <ArrowRight size={18} />
                  </button>
                )}
              </div>
              <div className="lecture-empty">
                <Video size={15} />
                <span>아직 연결된 강의가 없어요</span>
              </div>
            </div>
          )}
          <div className="privacy-note">
            <ShieldCheck size={14} />
            <span>
              {isDemo || !active
                ? '데모는 카메라와 사진을 사용하지 않아요'
                : '이 화면은 얼굴 영상의 녹화·저장·업로드를 구현하지 않아요'}
            </span>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <span className="footer-brand">jamme</span>
        <p>작은 연습이 만드는, 나만의 뷰티 루틴.</p>
        <span className="footer-label">MADE FOR YOUR EVERYDAY</span>
      </footer>
      {import.meta.env.DEV && (
        <section className="developer-tools" aria-label="개발 확인 도구">
          <details>
            <summary>
              <Code2 size={15} />
              개발 확인 도구
              <ChevronDown size={14} />
            </summary>
            <div className="developer-content">
              <p>고정 샘플 데이터입니다. 실제 렌즈 동작과 실기기 성능은 별도 검증이 필요해요.</p>
              {!config.config && (
                <div className="config-note">
                  <strong>실제 AR 연결에 필요한 설정</strong>
                  <ul>
                    {config.missing.map((name) => (
                      <li key={name}>
                        <code>{name}</code>
                      </li>
                    ))}
                  </ul>
                  <p>프로젝트의 .env.local에 입력한 뒤 개발 서버를 다시 시작하세요.</p>
                </div>
              )}
              <div className="debug-title">
                <span>선택한 스텝 JSON</span>
                <button className="secondary-button" onClick={() => void copyJson()}>
                  <Copy size={14} />
                  복사
                </button>
              </div>
              <span role="status">{copyStatus}</span>
              <pre tabIndex={0}>{JSON.stringify(debug, null, 2)}</pre>
            </div>
          </details>
        </section>
      )}
      <a
        className="skip-link"
        href="#help-panel"
        onClick={(event) => {
          event.preventDefault();
          setHelp(true);
        }}
      >
        이용 안내 보기 <ArrowDown size={14} />
      </a>
    </div>
  );
}
