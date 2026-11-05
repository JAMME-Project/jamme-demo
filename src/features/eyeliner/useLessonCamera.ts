import { useCallback, useEffect, useRef, useState } from 'react';
import type { FaceLandmarker } from '@mediapipe/tasks-vision';
import { ArError, toUserMessage } from '../ar/runtime/ArRuntime';
import { createGuideRenderer, loadGuideArtwork } from './drawGuides';
import type { LensKey } from './lesson';

type Settings = { key: string; guides: readonly LensKey[] };
type Status = 'idle' | 'starting' | 'running' | 'error';
type Session = { stop: () => void };

export function useLessonCamera(settings: Settings) {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [faceFound, setFaceFound] = useState(false);
  const session = useRef<Session | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sourceRef = useRef<HTMLCanvasElement | null>(null);
  const current = useRef(settings);

  useEffect(() => {
    current.current = settings;
  }, [settings]);

  const stop = useCallback(() => {
    session.current?.stop();
    setStatus('idle');
    setFaceFound(false);
  }, []);

  useEffect(() => {
    const hide = () => {
      if (document.hidden) stop();
    };
    window.addEventListener('pagehide', stop);
    document.addEventListener('visibilitychange', hide);
    return () => {
      window.removeEventListener('pagehide', stop);
      document.removeEventListener('visibilitychange', hide);
      session.current?.stop();
    };
  }, [stop]);

  async function start() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || session.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setStatus('error');
      setError('이 브라우저에서 카메라 화면을 그릴 수 없어요.');
      return;
    }

    let stream: MediaStream | undefined;
    let tracker: FaceLandmarker | undefined;
    let frame = 0;
    let videoFrame: number | undefined;
    let cancelled = false;
    const end = () => {
      if (cancelled) return;
      cancelled = true;
      cancelAnimationFrame(frame);
      if (videoFrame !== undefined) video.cancelVideoFrameCallback(videoFrame);
      stream?.getTracks().forEach((track) => track.stop());
      video.srcObject = null;
      sourceRef.current = null;
      tracker?.close();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      session.current = null;
    };
    session.current = { stop: end };
    setError('');
    setStatus('starting');
    setFaceFound(false);

    const fail = (cause: unknown) => {
      if (cancelled) return;
      end();
      setError(toUserMessage(cause));
      setStatus('error');
    };

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new ArError(
          'camera-unavailable',
          '카메라를 사용하려면 HTTPS 주소나 localhost에서 열어 주세요.',
        );
      }
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'user' }, width: { ideal: 640 }, height: { ideal: 480 } },
      });
      if (cancelled) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.getVideoTracks().forEach((track) => {
        track.addEventListener(
          'ended',
          () => fail(new ArError('ended', '카메라 연결이 끊겼어요. 다시 시작해 주세요.')),
          { once: true },
        );
      });
      video.srcObject = stream;
      await video.play();
      if (cancelled) return;
      const { createFaceTracker } = await import('./faceTracker');
      if (cancelled) return;
      tracker = await createFaceTracker();
      if (cancelled) {
        tracker.close();
        return;
      }

      const images = await loadGuideArtwork();
      if (cancelled) return;
      const detector = tracker;
      const renderGuides = createGuideRenderer(images);
      const input = document.createElement('canvas');
      const inputContext = input.getContext('2d');
      if (!inputContext) throw new Error('카메라 영상을 준비할 수 없어요.');
      const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
      let lastVideoTime = -1;
      let lastStep = '';
      let guideStart = 0;
      let found = false;
      let ready = false;

      const scheduleFrame = () => {
        if (typeof video.requestVideoFrameCallback === 'function') {
          videoFrame = video.requestVideoFrameCallback(render);
        } else {
          frame = requestAnimationFrame(render);
        }
      };
      const render = (time: number) => {
        if (cancelled) return;
        try {
          if (
            video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
            video.videoWidth &&
            video.currentTime !== lastVideoTime
          ) {
            const { videoWidth: width, videoHeight: height } = video;
            if (input.width !== width || input.height !== height) {
              canvas.width = input.width = width;
              canvas.height = input.height = height;
            }
            lastVideoTime = video.currentTime;
            // Detect and paint the same snapshot so a moving face cannot outrun its guide.
            inputContext.drawImage(video, 0, 0, width, height);
            const landmarks = detector.detectForVideo(input, time).faceLandmarks[0];
            if (Boolean(landmarks) !== found) {
              found = Boolean(landmarks);
              setFaceFound(found);
            }
            ctx.setTransform(-1, 0, 0, 1, width, 0);
            ctx.drawImage(input, 0, 0, width, height);
            ctx.resetTransform();
            const { key, guides } = current.current;
            if (key !== lastStep) {
              lastStep = key;
              guideStart = time;
            }
            if (landmarks) {
              renderGuides(
                ctx,
                landmarks,
                guides,
                key.startsWith('setup:'),
                reducedMotion ? 1000 : time - guideStart,
              );
            }
            sourceRef.current = input;
            if (!ready) {
              ready = true;
              setStatus('running');
            }
          }
          scheduleFrame();
        } catch (cause) {
          fail(cause);
        }
      };
      scheduleFrame();
    } catch (cause) {
      fail(cause);
    }
  }

  function capture(frame: HTMLElement) {
    const source = sourceRef.current;
    const preview = canvasRef.current;
    if (!source?.width || !preview) return null;
    const { width: videoWidth, height: videoHeight } = source;
    const bounds = preview.getBoundingClientRect();
    const crop = frame.getBoundingClientRect();
    const scale = Math.max(bounds.width / videoWidth, bounds.height / videoHeight);
    const left = bounds.left + (bounds.width - videoWidth * scale) / 2;
    const top = bounds.top + (bounds.height - videoHeight * scale) / 2;

    const photo = document.createElement('canvas');
    photo.width = Math.round(crop.width * 2);
    photo.height = Math.round(crop.height * 2);
    const ctx = photo.getContext('2d');
    if (!ctx) return null;
    const x = (crop.left - left) / scale;
    const y = (crop.top - top) / scale;
    const width = crop.width / scale;
    const height = crop.height / scale;
    ctx.translate(photo.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(
      source,
      videoWidth - x - width,
      y,
      width,
      height,
      0,
      0,
      photo.width,
      photo.height,
    );
    return photo.toDataURL('image/jpeg', 0.92);
  }

  return { videoRef, canvasRef, start, stop, capture, status, error, faceFound };
}
