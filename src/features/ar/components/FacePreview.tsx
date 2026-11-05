import { useId, type ReactNode } from 'react';

/** An authored illustration for the explicitly labelled demo, never camera output. */
export function FacePreview({
  color,
  intensity,
  softness,
  guideOn,
  viewBox = '0 0 600 650',
  label = '볼 효과를 확인하는 정적 얼굴 일러스트',
  children,
}: {
  color: number[];
  intensity: number;
  softness: number;
  guideOn: boolean;
  viewBox?: string;
  label?: string;
  children?: ReactNode;
}) {
  const id = useId().replace(/:/g, '');
  return (
    <svg
      className="face-preview"
      viewBox={viewBox}
      preserveAspectRatio={children ? 'xMidYMid slice' : undefined}
      role="img"
      aria-label={label}
    >
      <defs>
        <linearGradient id={`${id}-skin`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#f8d9c3" />
          <stop offset="1" stopColor="#dcae93" />
        </linearGradient>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#e5ded2" />
          <stop offset="1" stopColor="#f1e9de" />
        </linearGradient>
        <radialGradient id={`${id}-cheek`}>
          <stop stopColor={`rgb(${color.join(',')})`} stopOpacity={Math.min(1, intensity * 1.8)} />
          <stop
            offset={1 - softness * 0.6}
            stopColor={`rgb(${color.join(',')})`}
            stopOpacity={intensity * 0.6}
          />
          <stop offset="1" stopColor={`rgb(${color.join(',')})`} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-light`}>
          <stop stopColor="#fffaf0" stopOpacity=".5" />
          <stop offset="1" stopColor="#fffaf0" stopOpacity="0" />
        </radialGradient>
        <filter id={`${id}-shadow`}>
          <feGaussianBlur stdDeviation="13" />
        </filter>
      </defs>
      <path fill={`url(#${id}-bg)`} d="M0 0h600v650H0z" />
      <circle cx="115" cy="120" r="165" fill="#fbf7ed" opacity=".3" />
      <ellipse
        cx="304"
        cy="625"
        rx="185"
        ry="35"
        fill="#8e7464"
        opacity=".12"
        filter={`url(#${id}-shadow)`}
      />
      <path d="M121 650c2-92 39-144 123-158h112c84 14 121 66 123 158" fill="#ede9de" />
      <path d="M250 433v76c-8 31 108 39 102-1v-75" fill={`url(#${id}-skin)`} />
      <path d="M248 457c28 24 82 28 106-2v27c-34 21-75 17-106-4" fill="#ba8b74" opacity=".2" />
      <path
        d="M163 326c-24-91-17-236 94-256 137-38 194 47 190 174l-17 256c-38-34-49-38-76-46l-105-2c-31 1-58 14-83 39z"
        fill="#4b372d"
      />
      <ellipse cx="188" cy="318" rx="21" ry="38" fill="#ddad93" />
      <ellipse cx="414" cy="318" rx="21" ry="38" fill="#ddad93" />
      <path
        d="M193 225c0-78 218-108 218 11v98c-1 72-61 137-108 143-50-2-111-69-111-141z"
        fill={`url(#${id}-skin)`}
      />
      <ellipse cx="299" cy="298" rx="99" ry="139" fill={`url(#${id}-light)`} />
      <path
        d="M183 277c8-117 70-101 113-152 26 62 98 43 120 153 16-102-24-184-115-184-100 0-143 70-118 183"
        fill="#4b372d"
      />
      <path
        d="M199 264c23-14 48-13 63-3M341 261c22-11 40-10 58 2"
        stroke="#70503d"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M207 291c16-11 36-11 50 0M346 291c14-11 35-10 47 1"
        stroke="#644b3c"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M209 293q24 19 47-1M347 293q23 18 45 0" fill="#f0e1d2" />
      <ellipse cx="235" cy="294" rx="6" ry="7" fill="#544638" />
      <ellipse cx="369" cy="294" rx="6" ry="7" fill="#544638" />
      <circle cx="237" cy="291" r="2" fill="#fff" />
      <circle cx="371" cy="291" r="2" fill="#fff" />
      <path
        d="M304 296l-9 47q6 10 16 2"
        fill="none"
        stroke="#bd8c74"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M286 349q16 7 30 0" stroke="#b3846f" strokeWidth="2" fill="none" opacity=".6" />
      <ellipse cx="230" cy="339" rx="40" ry="29" fill={`url(#${id}-cheek)`} />
      <ellipse cx="374" cy="339" rx="40" ry="29" fill={`url(#${id}-cheek)`} />
      <path d="M275 390q15-11 28-5 11-6 27 5-28 27-55 0" fill="#b87870" />
      <path d="M276 390q27 7 53 0" stroke="#8c5a51" fill="none" strokeWidth="1.5" />
      <path d="M289 402q13 4 26-1" stroke="#efb0a1" fill="none" strokeWidth="2" />
      {guideOn && (
        <g fill="none" stroke="#fffaf0" strokeWidth="2" strokeDasharray="4 5" opacity=".95">
          <ellipse cx="230" cy="339" rx="40" ry="29" />
          <ellipse cx="374" cy="339" rx="40" ry="29" />
        </g>
      )}
      <circle cx="186" cy="361" r="5" fill="#d2b681" />
      <circle cx="416" cy="361" r="5" fill="#d2b681" />
      <path d="M211 523q89 70 181 0M300 551v99" stroke="#d8d1c3" strokeWidth="2" fill="none" />
      <path d="M193 542l-36 108M410 542l36 108" stroke="#f8f4ec" strokeWidth="12" opacity=".4" />
      {children}
    </svg>
  );
}
