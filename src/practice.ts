import type { CropVariant, FrameDocument, GuideKey, Ratio } from './model';

export type ExerciseId = 'thirds-free' | 'thirds-45' | 'breathing-169' | 'center-11';
export type PracticeStatus = 'in_progress' | 'completed' | 'skipped';
export type CheckLevel = 'pass' | 'near' | 'miss';

export interface CheckResult {
  id: string;
  label: string;
  detail: string;
  level: CheckLevel;
}

export interface ExerciseEvaluation {
  checks: CheckResult[];
  passed: boolean;
}

export interface ExerciseInput {
  crop: CropVariant;
  subject: { x: number; y: number } | null;
}

export interface Exercise {
  id: ExerciseId;
  order: number;
  title: string;
  goal: string;
  brief: string;
  ratio: Ratio | null;
  autoGuide: GuideKey;
  tips: string[];
}

export interface ExerciseRecord {
  exerciseId: ExerciseId;
  status: PracticeStatus;
  updatedAt: number;
  completedAt?: number;
}

/** 进入练习前对自由工作台状态拍下的快照（图片本身不复制，始终沿用当前图片）。 */
export interface WorkSnapshot {
  guides: Record<GuideKey, boolean>;
  subject: { x: number; y: number } | null;
  crop: CropVariant;
  variants: CropVariant[];
}

export interface ActiveSession {
  exerciseId: ExerciseId;
  startedAt: number;
  completed: boolean;
  snapshot: WorkSnapshot;
}

export interface PracticeState {
  version: 1;
  active: ActiveSession | null;
  records: Record<string, ExerciseRecord>;
  dismissedIntro: boolean;
}

export const EMPTY_PRACTICE: PracticeState = {
  version: 1,
  active: null,
  records: {},
  dismissedIntro: false,
};

export const EXERCISE_ORDER: ExerciseId[] = ['thirds-free', 'thirds-45', 'breathing-169', 'center-11'];

export const EXERCISES: Exercise[] = [
  {
    id: 'thirds-free',
    order: 1,
    title: '三分初见',
    goal: '把主体标记在画框的任意一个三分交点附近。',
    brief: '三分法把画框横向、纵向各分成三等份，四条线的交点是最自然的视觉落脚点。先点击画面标记主体，再拖动画框，让主体贴近某个交点。',
    ratio: null,
    autoGuide: 'thirds',
    tips: ['点击画面中最想让观众看到的位置来标记主体。', '拖动画框内部移动位置，右下角圆点可以缩放。', '四个交点任选其一，不必追求完全重合。'],
  },
  {
    id: 'thirds-45',
    order: 2,
    title: '竖幅三分',
    goal: '在 4:5 竖幅比例下，让主体对准三分交点，并让主体占够画面。',
    brief: '社交平台常用的 4:5 竖幅会裁掉两侧画面。先锁定比例，再移动、放大画框，保证主体既落在交点上，又不会缩在画面里太小。',
    ratio: '4:5',
    autoGuide: 'thirds',
    tips: ['比例由练习指定，左侧比例栏在练习中会锁定。', '画框面积建议至少占原图的 40%，主体才足够突出。', '缩放时比例会自动保持，只拖右下角即可。'],
  },
  {
    id: 'breathing-169',
    order: 3,
    title: '呼吸空间',
    goal: '在 16:9 横幅中把主体放在一侧三分线附近，让朝向一侧的留白明显大于身后。',
    brief: '人物或运动的主体需要"前方留白"：视线或动作朝向的那一侧要留出明显更大的空间，画面才不憋气。让主体靠近左或右三分线，开口方向约占三分之二，同时背后也要留出一点空隙。',
    ratio: '16:9',
    autoGuide: 'thirds',
    tips: ['想象主体的朝向，把更多空间留给它“看过去”的那一边。', '主体纵向保持在画面中段即可，重点是横向位置。', '完全居中会缺少朝向感，贴住边缘又会太挤。'],
  },
  {
    id: 'center-11',
    order: 4,
    title: '居中力量',
    goal: '在 1:1 方形画框中居中构图：画框居中图面、主体贴近画框中心且足够大。',
    brief: '居中构图适合对称、有力量感的主体。方形画框要放在原图中央，主体放在画框正中心，并通过放大画框让主体占据足够面积。',
    ratio: '1:1',
    autoGuide: 'center',
    tips: ['先用中心线确认画框本身在原图中央。', '再让主体标记贴近画框中心，而不是原图中心。', '画框面积建议至少占原图 28%。'],
  },
];

export const EXERCISE_MAP: Record<ExerciseId, Exercise> = Object.fromEntries(
  EXERCISES.map((exercise) => [exercise.id, exercise]),
) as Record<ExerciseId, Exercise>;

export function getExercise(id: string): Exercise | null {
  return EXERCISE_MAP[id as ExerciseId] ?? null;
}

export function nextExerciseId(id: ExerciseId): ExerciseId | null {
  const index = EXERCISE_ORDER.indexOf(id);
  return index >= 0 && index < EXERCISE_ORDER.length - 1 ? EXERCISE_ORDER[index + 1] : null;
}

// ---- 判定阈值 ----
const THIRDS_PASS = 0.07;
const THIRDS_NEAR = 0.14;
const COVERAGE_45_PASS = 0.4;
const COVERAGE_45_NEAR = 0.3;
const BAND_PASS_X = 0.08;
const BAND_NEAR_X = 0.16;
const BAND_PASS_Y = 0.28;
const BAND_NEAR_Y = 0.36;
// 主体在三分线附近时较大一侧留白约 67%；居中是 50%（没有朝向感），贴边则小侧被压没
const BREATHE_OPEN_PASS = 0.55;
const BREATHE_OPEN_NEAR = 0.52;
const BREATHE_BACK_PASS = 0.12;
const BREATHE_BACK_NEAR = 0.08;
const CENTER_SUBJECT_PASS = 0.09;
const CENTER_SUBJECT_NEAR = 0.17;
const FRAME_CENTER_PASS = 0.06;
const FRAME_CENTER_NEAR = 0.12;
const COVERAGE_11_PASS = 0.28;
const COVERAGE_11_NEAR = 0.18;

const THIRDS_POINTS: Array<[number, number]> = [
  [1 / 3, 1 / 3],
  [2 / 3, 1 / 3],
  [1 / 3, 2 / 3],
  [2 / 3, 2 / 3],
];

const pct = (value: number): number => Math.round(value * 100);

/** 返回主体在画框内的归一化坐标；主体缺失或落在画框外时返回 null。 */
function subjectInFrame(crop: CropVariant, subject: { x: number; y: number } | null): { sx: number; sy: number } | null {
  if (!subject) return null;
  const sx = (subject.x - crop.x) / crop.width;
  const sy = (subject.y - crop.y) / crop.height;
  if (sx < -0.01 || sx > 1.01 || sy < -0.01 || sy > 1.01) return null;
  return { sx: Math.min(1, Math.max(0, sx)), sy: Math.min(1, Math.max(0, sy)) };
}

function nearestThirds(sx: number, sy: number): { point: [number, number]; distance: number; dx: number; dy: number } {
  let best = { point: THIRDS_POINTS[0], distance: Infinity, dx: 0, dy: 0 };
  for (const point of THIRDS_POINTS) {
    const dx = point[0] - sx;
    const dy = point[1] - sy;
    const distance = Math.hypot(dx, dy);
    if (distance < best.distance) best = { point, distance, dx, dy };
  }
  return best;
}

function direction(dx: number, dy: number): string {
  const parts: string[] = [];
  if (Math.abs(dx) >= 0.03) parts.push(dx > 0 ? '右' : '左');
  if (Math.abs(dy) >= 0.03) parts.push(dy > 0 ? '下' : '上');
  return parts.length > 0 ? parts.join('') : '微调';
}

function ratioCheck(expected: Ratio, crop: CropVariant): CheckResult {
  const passed = crop.ratio === expected;
  const current = crop.ratio === 'free' ? '自由裁切' : crop.ratio;
  return {
    id: 'ratio',
    label: `使用 ${expected} 比例`,
    level: passed ? 'pass' : 'miss',
    detail: passed ? `当前比例为 ${expected}。` : `当前是${current}，请在左侧“裁切比例”中选择 ${expected}。`,
  };
}

function markCheck(inside: boolean): CheckResult {
  return {
    id: 'mark',
    label: '在画框中标记主体',
    level: inside ? 'pass' : 'miss',
    detail: inside ? '主体已标记，点击画面可随时重新定位。' : '还没有标记主体：点击画面里最吸引视线的位置。',
  };
}

function thirdsCheck(crop: CropVariant, subject: { x: number; y: number } | null): CheckResult {
  if (!subject) {
    return { id: 'thirds', label: '主体贴近三分交点', level: 'miss', detail: '标记主体后才会开始判定位置。' };
  }
  const local = subjectInFrame(crop, subject);
  if (!local) {
    return { id: 'thirds', label: '主体贴近三分交点', level: 'miss', detail: '主体在画框外面：把画框拖到主体上，或点击框内重新标记。' };
  }
  const nearest = nearestThirds(local.sx, local.sy);
  const toward = direction(nearest.dx, nearest.dy);
  if (nearest.distance <= THIRDS_PASS) {
    return { id: 'thirds', label: '主体贴近三分交点', level: 'pass', detail: `主体距最近交点仅偏差 ${pct(nearest.distance)}%，落点很准。` };
  }
  if (nearest.distance <= THIRDS_NEAR) {
    return { id: 'thirds', label: '主体贴近三分交点', level: 'near', detail: `已经很近了，再向${toward}方微调一点（当前偏差 ${pct(nearest.distance)}%）。` };
  }
  return { id: 'thirds', label: '主体贴近三分交点', level: 'miss', detail: `离最近的三分交点还差 ${pct(nearest.distance)}%，试着把画框向${toward}方移动。` };
}

function coverageCheck(id: string, label: string, crop: CropVariant, passAt: number, nearAt: number): CheckResult {
  const area = crop.width * crop.height;
  if (area >= passAt) return { id, label, level: 'pass', detail: `画框占原图 ${pct(area)}%，主体足够突出。` };
  if (area >= nearAt) return { id, label, level: 'near', detail: `画框占原图 ${pct(area)}%，再放大一些会更有力（建议 ≥ ${pct(passAt)}%）。` };
  return { id, label, level: 'miss', detail: `画框只占原图 ${pct(area)}%，主体偏小：拖右下角放大到 ${pct(passAt)}% 以上。` };
}

function evaluateThirdsFree(input: ExerciseInput): CheckResult[] {
  const inside = subjectInFrame(input.crop, input.subject) !== null;
  return [markCheck(inside), thirdsCheck(input.crop, input.subject)];
}

function evaluateThirds45(input: ExerciseInput): CheckResult[] {
  const inside = subjectInFrame(input.crop, input.subject) !== null;
  return [
    ratioCheck('4:5', input.crop),
    markCheck(inside),
    thirdsCheck(input.crop, input.subject),
    coverageCheck('coverage', '画框足够大（面积 ≥ 40%）', input.crop, COVERAGE_45_PASS, COVERAGE_45_NEAR),
  ];
}

function breathingChecks(input: ExerciseInput): CheckResult[] {
  const crop = input.crop;
  const band: CheckResult = { id: 'band', label: '主体靠向一侧三分线', level: 'miss', detail: '' };
  const breathing: CheckResult = { id: 'breathing', label: '开口侧留白充足、背后不空不挤', level: 'miss', detail: '' };
  const local = subjectInFrame(crop, input.subject);
  if (!input.subject) {
    band.detail = '标记主体后才会开始判定位置。';
    breathing.detail = '先标记主体，再看留白是否足够。';
  } else if (!local) {
    band.detail = '主体在画框外面：把画框拖到主体上。';
    breathing.detail = '主体进画框后才能计算留白。';
  } else {
    const offsetX = Math.min(Math.abs(local.sx - 1 / 3), Math.abs(local.sx - 2 / 3));
    const offsetY = Math.abs(local.sy - 0.5);
    // 两侧留白：较大的一侧是“开口方向”，较小的一侧是背后空间
    const sides = [local.sx, 1 - local.sx].sort((a, b) => b - a);
    const open = sides[0];
    const back = sides[1];
    if (offsetX <= BAND_PASS_X && offsetY <= BAND_PASS_Y) {
      band.level = 'pass';
      band.detail = `主体位于${local.sx <= 0.5 ? '左' : '右'}侧三分线附近，纵向也在画面中段。`;
    } else if (offsetX <= BAND_NEAR_X && offsetY <= BAND_NEAR_Y) {
      band.level = 'near';
      band.detail = `接近${local.sx <= 0.5 ? '左' : '右'}侧三分线了，横向再收一点（偏差 ${pct(offsetX)}%）。`;
    } else {
      band.detail = offsetY > BAND_NEAR_Y
        ? `主体纵向偏离画面中段（偏差 ${pct(offsetY)}%），先把画框上下移动到主体高度。`
        : `主体离两侧三分线都太远（横向偏差 ${pct(offsetX)}%），把画框横向移向主体。`;
    }
    if (back < BREATHE_BACK_NEAR) {
      breathing.detail = `主体几乎贴在边缘上，背后只留 ${pct(back)}%：往开口方向反方向退一点，让两侧都有空间。`;
    } else if (back < BREATHE_BACK_PASS) {
      breathing.level = 'near';
      breathing.detail = `主体身后只剩 ${pct(back)}%，略挤，给背后再留一点空间。`;
    } else if (open < BREATHE_OPEN_NEAR) {
      breathing.detail = `主体接近居中（两侧各约 ${pct(open)}%），缺少朝向感：把主体移到一侧三分线附近。`;
    } else if (open < BREATHE_OPEN_PASS) {
      breathing.level = 'near';
      breathing.detail = `开口侧留白 ${pct(open)}%，呼吸感还不够，再把主体往三分线方向靠。`;
    } else {
      breathing.level = 'pass';
      breathing.detail = `开口方向留白 ${pct(open)}%、背后 ${pct(back)}%，呼吸感充足。`;
    }
  }
  return [band, breathing];
}

function evaluateBreathing169(input: ExerciseInput): CheckResult[] {
  const inside = subjectInFrame(input.crop, input.subject) !== null;
  return [ratioCheck('16:9', input.crop), markCheck(inside), ...breathingChecks(input)];
}

function evaluateCenter11(input: ExerciseInput): CheckResult[] {
  const crop = input.crop;
  const checks: CheckResult[] = [ratioCheck('1:1', crop)];
  const inside = subjectInFrame(crop, input.subject) !== null;
  checks.push(markCheck(inside));

  const frameCX = crop.x + crop.width / 2;
  const frameCY = crop.y + crop.height / 2;
  const frameOffset = Math.hypot(frameCX - 0.5, frameCY - 0.5);
  if (frameOffset <= FRAME_CENTER_PASS) {
    checks.push({ id: 'frame-center', label: '画框居于原图中心', level: 'pass', detail: `画框中心偏差 ${pct(frameOffset)}%，构图端正。` });
  } else if (frameOffset <= FRAME_CENTER_NEAR) {
    checks.push({ id: 'frame-center', label: '画框居于原图中心', level: 'near', detail: `画框基本居中，偏差 ${pct(frameOffset)}%，再向中部靠一点。` });
  } else {
    const dx = 0.5 - frameCX;
    const dy = 0.5 - frameCY;
    checks.push({ id: 'frame-center', label: '画框居于原图中心', level: 'miss', detail: `画框偏离原图中心 ${pct(frameOffset)}%，向${direction(dx, dy)}方移动。` });
  }

  const local = subjectInFrame(crop, input.subject);
  if (!input.subject) {
    checks.push({ id: 'subject-center', label: '主体贴近画框中心', level: 'miss', detail: '标记主体后才会开始判定位置。' });
  } else if (!local) {
    checks.push({ id: 'subject-center', label: '主体贴近画框中心', level: 'miss', detail: '主体在画框外面：把画框拖到主体上，或点击框内重新标记。' });
  } else {
    const d = Math.hypot(local.sx - 0.5, local.sy - 0.5);
    if (d <= CENTER_SUBJECT_PASS) {
      checks.push({ id: 'subject-center', label: '主体贴近画框中心', level: 'pass', detail: `主体距画框中心偏差 ${pct(d)}%，居中稳定。` });
    } else if (d <= CENTER_SUBJECT_NEAR) {
      checks.push({ id: 'subject-center', label: '主体贴近画框中心', level: 'near', detail: `主体接近中心，偏差 ${pct(d)}%，再微调一步。` });
    } else {
      const toward = direction(0.5 - local.sx, 0.5 - local.sy);
      checks.push({ id: 'subject-center', label: '主体贴近画框中心', level: 'miss', detail: `主体距画框中心 ${pct(d)}%，把画框向${toward}方移动（或重新点击中心位置）。` });
    }
  }

  checks.push(coverageCheck('coverage', '画框足够大（面积 ≥ 28%）', crop, COVERAGE_11_PASS, COVERAGE_11_NEAR));
  return checks;
}

export function evaluateExercise(exercise: Exercise, input: ExerciseInput): ExerciseEvaluation {
  let checks: CheckResult[];
  switch (exercise.id) {
    case 'thirds-free':
      checks = evaluateThirdsFree(input);
      break;
    case 'thirds-45':
      checks = evaluateThirds45(input);
      break;
    case 'breathing-169':
      checks = evaluateBreathing169(input);
      break;
    case 'center-11':
      checks = evaluateCenter11(input);
      break;
  }
  return { checks, passed: checks.every((check) => check.level === 'pass') };
}

export interface TargetHint {
  x: number;
  y: number;
  kind: 'thirds' | 'center';
}

/** 画布上的目标提示点，坐标换算回原图归一化空间，画框移动时提示点会跟着走。 */
export function exerciseTargets(exercise: Exercise, crop: CropVariant): TargetHint[] {
  if (exercise.id === 'center-11') {
    return [{ x: crop.x + crop.width / 2, y: crop.y + crop.height / 2, kind: 'center' }];
  }
  return THIRDS_POINTS.map(([px, py]) => ({ x: crop.x + px * crop.width, y: crop.y + py * crop.height, kind: 'thirds' as const }));
}

export function snapshotDocument(document: FrameDocument): WorkSnapshot {
  return {
    guides: structuredClone(document.guides),
    subject: document.subject ? { ...document.subject } : null,
    crop: { ...document.crop },
    variants: document.variants.map((variant) => ({ ...variant })),
  };
}

export function restoreDocument(document: FrameDocument, snapshot: WorkSnapshot): FrameDocument {
  return {
    ...document,
    guides: structuredClone(snapshot.guides),
    subject: snapshot.subject ? { ...snapshot.subject } : null,
    crop: { ...snapshot.crop },
    variants: snapshot.variants.map((variant) => ({ ...variant })),
  };
}

export function isPracticeState(value: unknown): value is PracticeState {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<PracticeState>;
  return candidate.version === 1 && typeof candidate.records === 'object' && ('active' in candidate);
}

export function completedCount(records: Record<string, ExerciseRecord>): number {
  return EXERCISES.filter((exercise) => records[exercise.id]?.status === 'completed').length;
}
