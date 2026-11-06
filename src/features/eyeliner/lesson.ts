export const lenses = {
  eye1: { name: 'eyeline 1', id: '24eb4b8c-7623-4bec-b095-41d68931ca0c' },
  eye2: { name: 'eyeline 2', id: '588fca7a-cc92-4c2b-8dd9-4366e12a33a4' },
  eye3: { name: 'eyeline 3', id: 'aaf7d774-3a3f-4d8d-b3de-728404addd8a' },
  eye4: { name: 'eyeline 4', id: 'aed6a665-1ec0-476b-bd64-06bc4aa4f8c1' },
  eye5: { name: 'eyeline 5', id: 'be2cd684-6da8-45f9-b207-579c7a7b6129' },
  eye6: { name: 'eyeline 6', id: 'e6bba4b1-f72a-452d-8343-f0266082e8e6' },
  eye7: { name: 'eyeline 7', id: '1672ffea-d7b2-4c34-abd1-4e97e3f594fd' },
  animation1: { name: 'eyeline animation1', id: '77d579db-633a-4ae4-afbf-3b2aa7d6b4a8' },
  animation2: { name: 'eyeline animation2', id: '2124b1b4-45fe-4dea-b2f9-6325ba3d9b39' },
  final: { name: 'final', id: '679c9a10-1ec2-4b19-b7d1-a4c2dfd5b387' },
};

export type LensKey = keyof typeof lenses;

type LessonStep = {
  key: string;
  number: number;
  title: string;
  body: string;
  tip?: string;
  action: string;
  guides: readonly LensKey[];
  replay?: boolean;
  check?: boolean;
};

const startAndEnd = ['eye1', 'eye2', 'eye3'] as const;
const fullLine = [...startAndEnd, 'eye4', 'eye5', 'eye6'] as const;

export const steps: readonly LessonStep[] = [
  {
    key: 'zoom',
    number: 0,
    title: '눈이 잘 보이게 확대해요',
    body: '두 손가락으로 화면을 벌리거나 확대 버튼을 눌러 눈이 잘 보이게 맞춰 주세요.',
    action: '이 크기로 계속',
    guides: [],
  },
  {
    key: 'setup',
    number: 0,
    title: '손을 볼에 가볍게 고정해요',
    body: '새끼손가락에 퍼프를 끼우고 볼에 가볍게 대세요.',
    tip: '점선 동그라미 위치에 손을 두면 선이 흔들리지 않아요.',
    action: '준비됐어요',
    guides: [],
  },
  {
    key: 'start',
    number: 1,
    title: '시작점을 찍어요',
    body: '눈꼬리에서 눈 앞머리 쪽으로 약 0.5cm 들어온 곳에 점을 찍으세요.',
    tip: '이때 붓끝을 세워 주세요.',
    action: '점을 찍었어요',
    guides: ['eye1'],
  },
  {
    key: 'baseline',
    number: 2,
    title: '꼬리 끝을 정해요',
    body: '콧방울 바깥쪽과 눈썹 꼬리를 잇는 가이드를 보세요.',
    action: '다음',
    guides: ['eye1', 'eye2'],
  },
  {
    key: 'endpoint',
    number: 2,
    title: '꼬리 끝을 정해요',
    body: '시작점 높이에서 바깥쪽으로 뻗어 사선 가이드와 만나는 곳을 끝점으로 잡으세요.',
    action: '끝점을 잡았어요',
    guides: startAndEnd,
  },
  {
    key: 'tail',
    number: 3,
    title: '꼬리를 그려요',
    body: '시작점에서 바깥쪽 끝점까지 짧게 끊어 그려요.',
    tip: '분홍 점선이 움직이는 방향대로 따라 그려요.',
    action: '다 그렸어요',
    guides: [...startAndEnd, 'animation1'],
    replay: true,
  },
  {
    key: 'check-tail',
    number: 4,
    title: '눈을 뜨고 확인해요',
    body: '거울을 보고, 가이드처럼 알맞게 그렸는지 검토하고 수정해 보세요.',
    tip: '파란 꼬리 가이드와 내가 그린 선이 겹치는지 화면으로 바로 확인해요.',
    action: '잘 그렸어요',
    guides: [...startAndEnd, 'eye4'],
    check: true,
  },
  {
    key: 'second-dot',
    number: 5,
    title: '두 번째 점을 찍어요',
    body: '처음 찍은 점에서 눈 앞머리 쪽으로 약 0.5cm 더 이동해 점을 찍으세요.',
    action: '점을 찍었어요',
    guides: [...startAndEnd, 'eye5'],
  },
  {
    key: 'connect',
    number: 6,
    title: '두 점을 연결해요',
    body: '두 번째 점에서 처음 찍은 점까지 짧게 끊어 연결하세요.',
    tip: '분홍 점선을 따라 천천히 이어요.',
    action: '연결했어요',
    guides: [...startAndEnd, 'eye5', 'animation2'],
    replay: true,
  },
  {
    key: 'check-line',
    number: 7,
    title: '눈을 뜨고 확인해요',
    body: '거울을 보고, 가이드처럼 알맞게 그렸는지 검토하고 수정해 보세요.',
    tip: '연결 가이드를 따라 두 점 사이가 끊김 없이 이어졌는지 봐요.',
    action: '잘 그렸어요',
    guides: fullLine,
    check: true,
  },
  {
    key: 'front',
    number: 8,
    title: '눈 앞쪽을 이어 그려요',
    body: '붓을 눕히고, 가이드를 따라 눈 앞쪽 라인을 그리세요.',
    tip: '거울로 위치를 확인하며 수정해 보세요.',
    action: '다 그렸어요',
    guides: [...fullLine, 'eye7'],
  },
  {
    key: 'capture',
    number: 8,
    title: '완성한 눈을 찍어 주세요',
    body: '눈을 편하게 뜨고 정면을 바라봐 주세요. 양쪽 눈이 잘 보이도록 프레임에 맞춰 주세요.',
    tip: '꼬리 쪽으로 점차 두꺼워졌는지, 양쪽이 대칭인지도 함께 봐요.',
    action: '촬영',
    guides: [],
  },
];
