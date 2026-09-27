import type { ExerciseFeedback, FrameDocument, GuideKey } from './model';

export interface Exercise {
  id: string;
  title: string;
  goal: string;
  criteria: string[];
  tip: string;
  guide?: GuideKey;
  evaluate: (document: FrameDocument) => ExerciseFeedback;
}

const THIRD_POINTS = [
  { x: 1 / 3, y: 1 / 3, label: '左上' },
  { x: 2 / 3, y: 1 / 3, label: '右上' },
  { x: 1 / 3, y: 2 / 3, label: '左下' },
  { x: 2 / 3, y: 2 / 3, label: '右下' },
];

const distance = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(ax - bx, ay - by);
const percent = (value: number): string => `${Math.round(value * 100)}%`;

function nearestThirdPoint(x: number, y: number): { point: (typeof THIRD_POINTS)[number]; d: number } {
  return THIRD_POINTS.reduce(
    (best, point) => {
      const d = distance(x, y, point.x, point.y);
      return d < best.d ? { point, d } : best;
    },
    { point: THIRD_POINTS[0], d: Number.POSITIVE_INFINITY },
  );
}

function directionHint(dx: number, dy: number): string {
  const horizontal = dx > 0.02 ? '右' : dx < -0.02 ? '左' : '';
  const vertical = dy > 0.02 ? '下' : dy < -0.02 ? '上' : '';
  return vertical + horizontal || '原地';
}

function evaluateThirdsAny(document: FrameDocument): ExerciseFeedback {
  const subject = document.subject;
  if (!subject) return { status: 'far', message: '还没有标记主体：直接点击画面中最吸引你的位置。' };
  const { point, d } = nearestThirdPoint(subject.x, subject.y);
  if (d <= 0.05) return { status: 'done', message: `主体已落在${point.label}三分交点附近，视觉重心成立。` };
  if (d <= 0.12) return { status: 'close', message: `很接近了：主体离${point.label}交点还差约 ${percent(d)} 的画面距离，再微调一点。` };
  return { status: 'far', message: `主体目前偏离所有交点，试着把它移向最近的${point.label}三分交点（还差约 ${percent(d)}）。` };
}

function evaluateThirdsTarget(document: FrameDocument): ExerciseFeedback {
  const subject = document.subject;
  if (!subject) return { status: 'far', message: '先点击画面标记主体，再把它移向右上交点。' };
  const target = { x: 2 / 3, y: 1 / 3 };
  const d = distance(subject.x, subject.y, target.x, target.y);
  if (d <= 0.045) return { status: 'done', message: '主体精确落在右上三分交点，这是人像与风景都常用的经典位置。' };
  const hint = directionHint(target.x - subject.x, target.y - subject.y);
  if (d <= 0.1) return { status: 'close', message: `只差约 ${percent(d)}：把主体再向${hint}微调，对准右上交点。` };
  return { status: 'far', message: `主体离右上交点（横向 2/3、纵向 1/3）还差约 ${percent(d)}，请向${hint}移动。` };
}

const BREATHING_RATIO = '4:5';
const BREATHING_MARGIN = 0.12;

function evaluateBreathingRoom(document: FrameDocument): ExerciseFeedback {
  const crop = document.crop;
  if (crop.ratio !== BREATHING_RATIO) {
    return { status: 'far', message: `先在左侧「裁切比例」选择 ${BREATHING_RATIO}，再安排主体的呼吸空间。` };
  }
  const subject = document.subject;
  if (!subject) return { status: 'far', message: '点击画面标记主体，才能判断它四周的空间。' };
  const margins = [
    { label: '左侧', value: (subject.x - crop.x) / crop.width },
    { label: '右侧', value: (crop.x + crop.width - subject.x) / crop.width },
    { label: '上方', value: (subject.y - crop.y) / crop.height },
    { label: '下方', value: (crop.y + crop.height - subject.y) / crop.height },
  ];
  const tightest = margins.reduce((a, b) => (b.value < a.value ? b : a));
  if (tightest.value < 0) return { status: 'far', message: '主体已经在裁切框之外了，拖动裁切框把它包进来。' };
  if (tightest.value >= BREATHING_MARGIN) {
    return { status: 'done', message: `主体四周都留出了至少 ${percent(BREATHING_MARGIN)} 的空间，画面可以呼吸。` };
  }
  if (tightest.value >= BREATHING_MARGIN / 2) {
    return { status: 'close', message: `主体${tightest.label}只留了 ${percent(tightest.value)}，目标 ${percent(BREATHING_MARGIN)}：把裁切框往${tightest.label}让一点。` };
  }
  return { status: 'far', message: `主体几乎贴着${tightest.label}边缘（仅 ${percent(tightest.value)}），移动裁切框或主体，把空间让出来。` };
}

const CROP_AREA_MIN = 0.35;
const CROP_AREA_MAX = 0.65;

function evaluateDecisiveCrop(document: FrameDocument): ExerciseFeedback {
  const subject = document.subject;
  if (!subject) return { status: 'far', message: '先点击标记主体，取舍时才知道要保住什么。' };
  const crop = document.crop;
  const inside = subject.x >= crop.x && subject.x <= crop.x + crop.width && subject.y >= crop.y && subject.y <= crop.y + crop.height;
  if (!inside) return { status: 'far', message: '主体被裁到框外了——取舍可以大胆，但主体要留住。' };
  const area = crop.width * crop.height;
  if (area >= CROP_AREA_MIN && area <= CROP_AREA_MAX) {
    return { status: 'done', message: `裁切面积 ${percent(area)}，主体保留、干扰被裁掉，这次取舍成立。` };
  }
  if (area > CROP_AREA_MAX) {
    const status = area <= CROP_AREA_MAX + 0.1 ? 'close' : 'far';
    return { status, message: `裁切面积还有 ${percent(area)}，目标 ${percent(CROP_AREA_MIN)}–${percent(CROP_AREA_MAX)}：再裁掉一些边缘干扰。` };
  }
  const status = area >= CROP_AREA_MIN - 0.1 ? 'close' : 'far';
  return { status, message: `裁切面积只剩 ${percent(area)}，画面太紧了：放宽到 ${percent(CROP_AREA_MIN)} 以上，给主体留点余地。` };
}

export const EXERCISES: Exercise[] = [
  {
    id: 'thirds-any',
    title: '把主体放上三分点',
    goal: '看着三分网格，点击画面标记主体，并把它移到任意一个三分交点附近。',
    criteria: ['画面中已经标记了主体', '主体落在任一三分交点附近（容差约 5% 画面距离）'],
    tip: '点击画面即可放置主体标记，再点新位置就能移动它。',
    guide: 'thirds',
    evaluate: evaluateThirdsAny,
  },
  {
    id: 'thirds-target',
    title: '瞄准右上交点',
    goal: '把主体精确地放到右上三分交点：画面横向 2/3、纵向 1/3 的位置。',
    criteria: ['主体已标记', '主体与右上交点的距离在 4.5% 以内'],
    tip: '主体标记会跟随你的点击移动，可以反复微调。',
    guide: 'thirds',
    evaluate: evaluateThirdsTarget,
  },
  {
    id: 'breathing-room',
    title: '给主体留出呼吸空间',
    goal: '使用 4:5 裁切比例，让主体留在裁切框内，四周都留出至少 12% 的空间。',
    criteria: ['裁切比例设为 4:5', '主体在裁切框内', '主体到四边的距离都 ≥ 裁切框宽高的 12%'],
    tip: '在左侧选择 4:5 比例，再拖动裁切框和主体标记来调整位置。',
    evaluate: evaluateBreathingRoom,
  },
  {
    id: 'decisive-crop',
    title: '大胆裁掉干扰',
    goal: '把裁切面积控制在原图的 35%–65% 之间，同时把主体保留在画面里。',
    criteria: ['主体已标记且在裁切框内', '裁切面积在原图的 35%–65% 之间'],
    tip: '拖动裁切框右下角的手柄缩放，拖动框体移动位置。',
    evaluate: evaluateDecisiveCrop,
  },
];

export function getExercise(id: string): Exercise | undefined {
  return EXERCISES.find((exercise) => exercise.id === id);
}

export function nextExerciseId(currentId: string | null): string | null {
  const index = EXERCISES.findIndex((exercise) => exercise.id === currentId);
  return index >= 0 && index < EXERCISES.length - 1 ? EXERCISES[index + 1].id : null;
}
