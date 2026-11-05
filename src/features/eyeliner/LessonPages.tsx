import { Check, Circle, PenLine, Smartphone, Square, Sun } from 'lucide-react';
import { Action, AppBar, Chip, asset } from './lessonUi';

const prepGroups = [
  {
    label: '환경',
    items: [
      {
        icon: Sun,
        title: '밝은 곳에서 시작해요',
        body: '얼굴에 그림자가 지지 않게 조명을 마주 봐요',
        tone: 'beige',
        tag: undefined,
      },
      {
        icon: Smartphone,
        title: '휴대폰을 얼굴 정면에 두세요',
        body: '거치대나 컵에 세워 두면 두 손이 자유로워요',
        tone: 'lilac',
        tag: undefined,
      },
    ],
  },
  {
    label: '준비물',
    items: [
      {
        icon: PenLine,
        title: '붓펜 아이라이너',
        body: '붓처럼 가는 끝으로 점과 선을 그려요',
        tone: 'pink',
        tag: '필수',
      },
      {
        icon: Square,
        title: '거울',
        body: '눈을 뜨고 결과를 확인할 때 써요',
        tone: 'green',
        tag: '필수',
      },
      {
        icon: Circle,
        title: '퍼프',
        body: '새끼손가락에 끼워 손을 고정해요',
        tone: 'beige',
        tag: '선택',
      },
    ],
  },
];

export function Introduction({ onNext }: { onNext: () => void }) {
  return (
    <>
      <AppBar title="젬메 아이라인 튜토리얼" />
      <main className="j-scroll j-intro">
        <div className="j-hero">
          <img src={asset('result-reference.jpg')} alt="아이라인을 완성한 눈매 예시" />
          <Chip tone="glass">완성 예시</Chip>
        </div>
        <div className="j-chips">
          <Chip>왕초보</Chip>
          <Chip tone="neutral">8단계</Chip>
          <Chip tone="neutral">약 10분</Chip>
        </div>
        <h1>
          이런 아이라인을
          <br />
          그릴 거예요
        </h1>
        <p>
          화면에 비친 가이드와 같은 아이라인을
          <br />
          그리는 연습을 할 거예요!
        </p>
        <section className="j-tiles">
          <h2>오늘 배울 동작</h2>
          <ol>
            {['점 찍기', '꼬리 그리기', '두 점 연결', '앞쪽 잇기'].map((label, index) => (
              <li key={label}>
                <span>{index + 1}</span>
                {label}
              </li>
            ))}
          </ol>
        </section>
      </main>
      <footer className="j-footer">
        <Action onClick={onNext}>준비하러 가기</Action>
      </footer>
    </>
  );
}

export function Preparation({ onBack, onStart }: { onBack: () => void; onStart: () => void }) {
  return (
    <>
      <AppBar back={onBack} />
      <main className="j-scroll j-prep">
        <h1>수업 전에 준비해 주세요</h1>
        <p>밝은 곳에서 휴대폰을 얼굴 정면에 두세요.</p>
        {prepGroups.map(({ label, items }) => (
          <section key={label}>
            <h2>{label}</h2>
            <ul>
              {items.map(({ icon: Icon, title, body, tone, tag }) => (
                <li key={title}>
                  <span className={`j-tile-icon j-tile-icon--${tone}`}>
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <div>
                    <h3>
                      {title}
                      {tag && <Chip tone={tag === '필수' ? 'pink' : 'neutral'}>{tag}</Chip>}
                    </h3>
                    <p>{body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>
      <footer className="j-footer">
        <Action onClick={onStart}>카메라 켜고 시작하기</Action>
      </footer>
    </>
  );
}

export function PhotoReview({
  photo,
  onRetake,
  onSave,
}: {
  photo: string;
  onRetake: () => void;
  onSave: () => void;
}) {
  return (
    <>
      <AppBar title="사진 확인" back={onRetake} review />
      <main className="j-scroll j-review">
        <img src={photo} className="j-review-photo" alt="방금 찍은 아이라인 사진" />
        <h1>아이라인 연습을 마쳤어요</h1>
        <p>완성한 아이라인을 확인해 보세요. 사진이 흐리거나 가려졌다면 다시 찍을 수 있어요.</p>
        <div className="j-chips">
          {['양쪽 눈이 보여요', '밝기 적당해요', '흔들림 없어요'].map((label) => (
            <Chip key={label} tone="green">
              <Check size={12} aria-hidden="true" />
              {label}
            </Chip>
          ))}
        </div>
      </main>
      <footer className="j-footer j-footer--split">
        <Action secondary onClick={onRetake}>
          다시 찍기
        </Action>
        <Action onClick={onSave}>사진 저장하고 마치기</Action>
      </footer>
    </>
  );
}
