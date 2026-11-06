import { useRef, useState, type PointerEvent } from 'react';
import { steps } from './lesson';
import { Action, Chip, HomeIndicator, IconButton, asset } from './lessonUi';
import { Introduction, PhotoReview, Preparation } from './LessonPages';
import { useLessonCamera } from './useLessonCamera';
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import './eyeliner.css';

type Page = 'intro' | 'prep' | 'camera' | 'review';

export function EyelinerTutorial() {
  const [page, setPage] = useState<Page>('intro');
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [replay, setReplay] = useState(0);
  const [photo, setPhoto] = useState('');
  const [captureError, setCaptureError] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const fingers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; zoom: number } | null>(null);
  const step = steps[index];
  const zoomStep = step.key === 'zoom';
  const capture = step.key === 'capture';
  const cameraPage = page === 'camera';
  const camera = useLessonCamera({ key: `${step.key}:${replay}`, guides: step.guides });
  const running = camera.status === 'running';
  const starting = camera.status === 'starting';
  const cameraMessage = !running
    ? camera.error || (starting ? '카메라를 켜고 있어요.' : '카메라를 켜서 계속해 주세요.')
    : captureError
      ? '사진을 찍지 못했어요. 다시 눌러 주세요.'
      : !camera.faceFound
        ? '밝은 곳에서 얼굴을 화면 중앙에 맞춰 주세요.'
        : null;

  function openCamera(stepIndex: number) {
    setIndex(stepIndex);
    setCaptureError(false);
    setPage('camera');
    void camera.start();
  }

  function closeCamera() {
    camera.stop();
    setZoom(1);
    setPage('prep');
  }

  function goBack() {
    if (index === 0) closeCamera();
    else setIndex(index - 1);
  }

  function distance() {
    const [a, b] = fingers.current.values();
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  }

  function startPinch(event: PointerEvent<HTMLCanvasElement>) {
    if (event.pointerType !== 'touch') return;
    event.currentTarget.setPointerCapture(event.pointerId);
    fingers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const start = distance();
    if (start > 0 && fingers.current.size === 2) pinch.current = { distance: start, zoom };
  }

  function movePinch(event: PointerEvent<HTMLCanvasElement>) {
    if (!fingers.current.has(event.pointerId)) return;
    fingers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pinch.current && fingers.current.size === 2) {
      setZoom(Math.min(2, Math.max(1, (pinch.current.zoom * distance()) / pinch.current.distance)));
    }
  }

  function endPinch(event: PointerEvent<HTMLCanvasElement>) {
    fingers.current.delete(event.pointerId);
    pinch.current = null;
  }

  function takePhoto() {
    const image = frameRef.current && camera.capture(frameRef.current);
    if (!image) {
      setCaptureError(true);
      return;
    }
    setPhoto(image);
    setCaptureError(false);
    camera.stop();
    setPage('review');
  }

  function finish() {
    setPhoto('');
    setZoom(1);
    setPage('intro');
  }

  function savePhoto() {
    const link = document.createElement('a');
    link.href = photo;
    link.download = 'jamme-eyeliner.jpg';
    link.click();
    finish();
  }

  return (
    <div className={`j-v2${cameraPage ? ' j-v2--camera' : ''}`}>
      <div className="j-camera-feed" hidden={!cameraPage}>
        <video
          className="j-camera-input"
          ref={camera.videoRef}
          muted
          playsInline
          aria-hidden="true"
        />
        <canvas
          ref={camera.canvasRef}
          style={{ transform: `scale(${zoom})` }}
          aria-label="카메라 영상과 아이라인 가이드"
          hidden={!running}
          onPointerDown={startPinch}
          onPointerMove={movePinch}
          onPointerUp={endPinch}
          onPointerCancel={endPinch}
          onLostPointerCapture={endPinch}
        />
      </div>
      {page === 'intro' && <Introduction onNext={() => setPage('prep')} />}
      {page === 'prep' && <Preparation onBack={finish} onStart={() => openCamera(0)} />}
      {cameraPage && (
        <>
          <header className="j-camera-nav">
            <IconButton kind="close" label="카메라 끄기" onClick={closeCamera} glass />
            <div
              className="j-progress"
              role="progressbar"
              aria-label="수업 진행률"
              aria-valuenow={step.number}
              aria-valuemax={8}
            >
              {Array.from({ length: 8 }, (_, i) => (
                <i key={i} data-done={i < step.number} />
              ))}
            </div>
            <span>{capture ? '완성' : step.number ? `${step.number}/8` : '준비'}</span>
          </header>
          <main className="j-camera-main">
            {running && (
              <section className="j-bubble" aria-live="polite">
                <div className="j-bubble-heading">
                  <Chip>
                    {capture
                      ? '결과 확인'
                      : step.number
                        ? `${step.number} / 8`
                        : `준비 ${index + 1} / 2`}
                  </Chip>
                  <h1>{step.title}</h1>
                </div>
                <p>{step.body}</p>
                {zoomStep && (
                  <button
                    className="j-zoom-toggle"
                    type="button"
                    onClick={() => setZoom((current) => (current > 1 ? 1 : 1.35))}
                  >
                    {zoom > 1 ? '원래 크기' : '화면 확대'}
                  </button>
                )}
                {step.tip && (
                  <p className="j-tip">
                    <img src={asset('sparkle.svg')} alt="" />
                    {step.tip}
                  </p>
                )}
              </section>
            )}
            {running && capture && (
              <div className="j-capture-target">
                <div className="j-capture-frame" ref={frameRef}>
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
                <Chip tone="glass">양쪽 눈이 점선 틀 안에 들어오게 맞춰 주세요</Chip>
              </div>
            )}
            {running && step.key === 'setup' && camera.faceFound && (
              <div className="j-puff">
                <Chip tone="glass">퍼프</Chip>
                <Chip tone="glass">퍼프</Chip>
              </div>
            )}
            {cameraMessage && (
              <div className={`j-camera-message${running ? '' : ' j-camera-message--waiting'}`}>
                <p role={camera.error || captureError ? 'alert' : 'status'}>{cameraMessage}</p>
              </div>
            )}
          </main>
          <footer
            className={`j-footer j-footer--camera${capture && running ? ' j-footer--shutter' : ''}${step.check && running ? ' j-footer--split' : ''}`}
          >
            {step.check && running ? (
              <Action secondary onClick={goBack}>
                다시 그리기
              </Action>
            ) : (
              <IconButton kind="back" label="이전 단계" onClick={goBack} glass />
            )}
            {capture && running ? (
              <button className="j-shutter" type="button" aria-label="촬영" onClick={takePhoto}>
                <i />
              </button>
            ) : (
              <Action
                disabled={starting}
                onClick={running ? () => setIndex(index + 1) : () => void camera.start()}
              >
                {starting
                  ? '카메라 준비 중'
                  : running
                    ? step.action
                    : camera.error
                      ? '카메라 다시 켜기'
                      : '카메라 켜기'}
              </Action>
            )}
            {running && step.replay && (
              <IconButton
                kind="replay"
                label="가이드 다시 보기"
                onClick={() => setReplay(replay + 1)}
                glass
              />
            )}
          </footer>
        </>
      )}
      {page === 'review' && (
        <PhotoReview
          photo={photo}
          onRetake={() => openCamera(steps.length - 1)}
          onSave={savePhoto}
        />
      )}
      <HomeIndicator />
    </div>
  );
}
