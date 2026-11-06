import { expect, test, type Page } from '@playwright/test';

async function enterLesson(page: Page) {
  await page.getByRole('textbox', { name: '초대 코드' }).fill('241108');
  await page.getByRole('button', { name: '체험 시작' }).click();
  await expect(page.getByText('젬메 아이라인 튜토리얼', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '이런 아이라인을 그릴 거예요' })).toBeVisible();
  await page.getByRole('button', { name: '준비하러 가기' }).click();
  await expect(page.getByRole('heading', { name: '수업 전에 준비해 주세요' })).toBeVisible();
  await page.getByRole('button', { name: '카메라 켜고 시작하기' }).click();
}

test('the camera stays on through practice and releases for review and retakes', async ({
  page,
}) => {
  await page.addInitScript(() => {
    let starts = 0;
    let stops = 0;
    document.addEventListener('lesson-test-state', () => {
      document.documentElement.dataset.cameraStarts = String(starts);
      document.documentElement.dataset.cameraStops = String(stops);
    });
    navigator.mediaDevices.getUserMedia = async () => {
      starts++;
      const canvas = document.createElement('canvas');
      const face = new Image();
      face.src = '/figma-v2/camera-reference.jpg';
      await face.decode();
      canvas.width = 390;
      canvas.height = 844;
      const ctx = canvas.getContext('2d')!;
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      const draw = () => ctx.drawImage(face, 0, 0, canvas.width, canvas.height);
      draw();
      const stream = canvas.captureStream(24);
      const timer = setInterval(draw, 40);
      const track = stream.getVideoTracks()[0];
      const stop = track.stop.bind(track);
      track.stop = () => {
        stops++;
        clearInterval(timer);
        stop();
      };
      return stream;
    };
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: '젬메 체험 코드' })).toBeVisible();
  await page.getByRole('textbox', { name: '초대 코드' }).fill('000000');
  await page.getByRole('button', { name: '체험 시작' }).click();
  await expect(page.getByRole('alert')).toHaveText('초대 코드가 맞지 않아요.');
  await enterLesson(page);
  await expect(page.getByLabel('카메라 영상과 아이라인 가이드')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('heading', { name: '눈이 잘 보이게 확대해요' })).toBeVisible();
  const preview = page.getByLabel('카메라 영상과 아이라인 가이드');
  await page.getByRole('button', { name: '화면 확대', exact: true }).click();
  await expect(preview).toHaveCSS('transform', 'matrix(1.35, 0, 0, 1.35, 0, 0)');
  await page.getByRole('button', { name: '원래 크기', exact: true }).click();
  await expect(preview).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
  await page.getByRole('button', { name: '화면 확대', exact: true }).click();
  await page.getByRole('button', { name: '이 크기로 계속' }).click();
  await expect(page.getByRole('heading', { name: '손을 볼에 가볍게 고정해요' })).toBeVisible();
  await expect(preview).toHaveCSS('transform', 'matrix(1.35, 0, 0, 1.35, 0, 0)');
  await page.getByRole('button', { name: '준비됐어요' }).click();
  await expect
    .poll(() =>
      page.getByLabel('카메라 영상과 아이라인 가이드').evaluate((element) => {
        const ctx = (element as HTMLCanvasElement).getContext('2d')!;
        const pixels = ctx.getImageData(45, 345, 90, 50).data;
        return pixels.some(
          (red, i) => i % 4 === 0 && red < 155 && pixels[i + 1] > 145 && pixels[i + 2] > 210,
        );
      }),
    )
    .toBe(true);

  const placement = await page.evaluate(async () => {
    const modulePath = '/src/features/eyeliner/faceTracker.ts';
    const { createFaceTracker } = await import(modulePath);
    const tracker = await createFaceTracker();
    const video = document.querySelector('video')!;
    const face = tracker.detectForVideo(video, performance.now()).faceLandmarks[0];
    tracker.close();
    const canvas = document.querySelector<HTMLCanvasElement>('.j-camera-feed canvas')!;
    const ctx = canvas.getContext('2d')!;
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const point = (index: number) => ({
      x: (1 - face[index].x) * canvas.width,
      y: face[index].y * canvas.height,
    });
    const rings = [
      [263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466],
      [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246],
    ];
    return rings.map((ring, side) => {
      const points = ring.map(point);
      const polygon = new Path2D();
      points.forEach((p, i) => (i === 0 ? polygon.moveTo(p.x, p.y) : polygon.lineTo(p.x, p.y)));
      polygon.closePath();
      let count = 0;
      let totalX = 0;
      let totalY = 0;
      let inside = 0;
      for (let y = 0; y < canvas.height; y++) {
        for (let x = (side * canvas.width) / 2; x < ((side + 1) * canvas.width) / 2; x++) {
          const offset = (y * canvas.width + x) * 4;
          if (pixels[offset] >= 155 || pixels[offset + 1] <= 145 || pixels[offset + 2] <= 210)
            continue;
          count++;
          totalX += x + 0.5;
          totalY += y + 0.5;
          if (!ctx.isPointInPath(polygon, x + 0.5, y + 0.5)) continue;
          const distance = Math.min(
            ...points.map((a, i) => {
              const b = points[(i + 1) % points.length];
              const dx = b.x - a.x;
              const dy = b.y - a.y;
              const along = Math.max(
                0,
                Math.min(1, ((x + 0.5 - a.x) * dx + (y + 0.5 - a.y) * dy) / (dx * dx + dy * dy)),
              );
              return Math.hypot(x + 0.5 - a.x - along * dx, y + 0.5 - a.y - along * dy);
            }),
          );
          if (distance > 2) inside++;
        }
      }
      const upper = [points[0], ...points.slice(9).reverse(), points[8]];
      let arcLength = 0;
      let nearest = Infinity;
      let position = 0;
      upper.slice(1).forEach((b, i) => {
        const a = upper[i],
          dx = b.x - a.x,
          dy = b.y - a.y;
        const length = Math.hypot(dx, dy);
        const along = Math.max(
          0,
          Math.min(
            1,
            ((totalX / count - a.x) * dx + (totalY / count - a.y) * dy) / (length * length),
          ),
        );
        const distance = Math.hypot(
          totalX / count - a.x - along * dx,
          totalY / count - a.y - along * dy,
        );
        if (distance < nearest) {
          nearest = distance;
          position = arcLength + along * length;
        }
        arcLength += length;
      });
      const fraction = position / arcLength;
      return { count, inside, fraction };
    });
  });
  for (const eye of placement) {
    expect(eye.count).toBeGreaterThan(5);
    expect(eye.inside).toBe(0);
    expect(eye.fraction).toBeGreaterThan(0.13);
    expect(eye.fraction).toBeLessThan(0.23);
  }

  for (const label of [
    '점을 찍었어요',
    '다음',
    '끝점을 잡았어요',
    '다 그렸어요',
    '잘 그렸어요',
    '점을 찍었어요',
    '연결했어요',
    '잘 그렸어요',
    '다 그렸어요',
  ]) {
    await page.getByRole('button', { name: label, exact: true }).click();
  }

  await expect(page.getByRole('heading', { name: '완성한 눈을 찍어 주세요' })).toBeVisible();
  await page.getByRole('button', { name: '촬영' }).click();
  await expect(page.getByRole('img', { name: '방금 찍은 아이라인 사진' })).toHaveAttribute(
    'src',
    /^data:image\/jpeg;base64,/,
  );
  const photoAspect = await page
    .getByRole('img', { name: '방금 찍은 아이라인 사진' })
    .evaluate(async (element) => {
      const image = element as HTMLImageElement;
      await image.decode();
      const bounds = image.getBoundingClientRect();
      return Math.abs(bounds.width / bounds.height - image.naturalWidth / image.naturalHeight);
    });
  expect(photoAspect).toBeLessThan(0.01);
  await page.evaluate(() => document.dispatchEvent(new Event('lesson-test-state')));
  await expect(page.locator('html')).toHaveAttribute('data-camera-starts', '1');
  await expect(page.locator('html')).toHaveAttribute('data-camera-stops', '1');

  await page.getByRole('button', { name: '다시 찍기' }).click();
  await page.getByRole('button', { name: '촬영' }).click({ timeout: 20_000 });
  await expect(page.getByRole('heading', { name: '아이라인 연습을 마쳤어요' })).toBeVisible();
  await expect(page.getByRole('button', { name: '분석하기' })).toHaveCount(0);
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: '사진 저장하고 마치기' }).click();
  expect((await downloaded).suggestedFilename()).toBe('jamme-eyeliner.jpg');
  await expect(page.getByRole('button', { name: '준비하러 가기' })).toBeVisible();
  await page.evaluate(() => document.dispatchEvent(new Event('lesson-test-state')));
  await expect(page.locator('html')).toHaveAttribute('data-camera-starts', '2');
  await expect(page.locator('html')).toHaveAttribute('data-camera-stops', '2');
});

test('permission denial keeps the current lesson and allows retry', async ({ page }) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      await new Promise<void>((resolve) => {
        window.addEventListener('deny-lesson-camera', () => resolve(), { once: true });
      });
      throw new DOMException('Denied', 'NotAllowedError');
    };
  });
  await page.goto('/');
  await enterLesson(page);
  await expect(page.getByRole('status')).toHaveText('카메라를 켜고 있어요.');
  await expect(page.locator('.j-camera-feed img')).toHaveCount(0);
  await page.evaluate(() => window.dispatchEvent(new Event('deny-lesson-camera')));
  await expect(page.getByRole('alert')).toContainText('카메라 권한이 필요해요');
  await expect(page.getByRole('button', { name: '카메라 다시 켜기' })).toBeEnabled();
  await page.getByRole('button', { name: '카메라 끄기' }).click();
  await expect(page.getByRole('heading', { name: '수업 전에 준비해 주세요' })).toBeVisible();
});
