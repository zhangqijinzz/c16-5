import { useState, useSyncExternalStore } from 'react';
import { cropForRatio, makeVariant, moveCrop, resizeCrop } from './domain';
import { EMPTY_DOCUMENT, type FrameDocument, type GuideKey, type Ratio, type ViewState } from './model';
import type { FrameRepository } from './repository';
import type { PracticeRepository } from './practiceRepository';
import type { ImageService } from './service';
import {
  EMPTY_PRACTICE,
  evaluateExercise,
  EXERCISE_MAP,
  getExercise,
  restoreDocument,
  snapshotDocument,
  type Exercise,
  type ExerciseId,
  type ExerciseRecord,
  type PracticeState,
  type WorkSnapshot,
} from './practice';

type Listener = () => void;

export class FrameSenseViewModel {
  private state: ViewState = {
    phase: 'loading',
    document: structuredClone(EMPTY_DOCUMENT),
    practice: structuredClone(EMPTY_PRACTICE),
    compareOpen: false,
    notice: '',
    error: null,
  };
  private readonly listeners = new Set<Listener>();

  constructor(
    private readonly repository: FrameRepository,
    private readonly practiceRepository: PracticeRepository,
    private readonly imageService: ImageService,
  ) {}

  getSnapshot = (): ViewState => this.state;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private patch(next: Partial<ViewState>): void {
    this.state = { ...this.state, ...next };
    this.listeners.forEach((listener) => listener());
  }

  /** 持久化工作台与练习两份状态；任一存储失败只提示、不阻断编辑。 */
  private commit(document: FrameDocument, practice: PracticeState, notice: string): void {
    this.patch({ document, practice, phase: 'editing', notice, error: null });
    try {
      this.repository.save(document);
    } catch {
      this.patch({ phase: 'error', error: '工作台本地保存失败，但当前编辑仍保留在页面中。请检查浏览器存储权限。' });
    }
    try {
      this.practiceRepository.save(practice);
    } catch {
      this.patch({ phase: 'error', error: '练习记录保存失败，但当前进度仍保留在页面中。请检查浏览器存储权限。' });
    }
  }

  async initialize(): Promise<void> {
    this.patch({ phase: 'loading', notice: '正在恢复上次工作状态…', error: null });
    try {
      const document = this.repository.load();
      const practice = this.practiceRepository.load();
      const session = practice.active;
      // 重开页面时若练习进行到一半：工作台里存的就是沙盒，直接续上；
      // 会话指向的练习已失效或图片不在了，则用快照还原自由工作台。
      if (session && (!document.image || !getExercise(session.exerciseId))) {
        this.commit(restoreDocument(document, session.snapshot), { ...practice, active: null }, '上次的练习环境已无法续上，已回到自由工作台。');
        return;
      }
      const inPractice = session !== null;
      this.patch({
        document,
        practice,
        phase: document.image ? 'editing' : 'ready',
        notice: inPractice
          ? `已恢复练习「${EXERCISE_MAP[session!.exerciseId].title}」，可以继续。`
          : document.image
            ? '已恢复上次工作状态'
            : '欢迎来到 FrameSense，可以从右侧的构图练习开始。',
        error: null,
      });
    } catch {
      this.patch({ phase: 'error', notice: '未能读取历史状态，可继续新建工作。', error: '本地数据读取失败。' });
    }
  }

  async importImage(file: File): Promise<void> {
    this.patch({ phase: 'loading', notice: '正在载入图片…', error: null });
    try {
      const image = await this.imageService.readFile(file);
      const document: FrameDocument = { ...structuredClone(EMPTY_DOCUMENT), image };
      // 换图片意味着原有沙盒不再适用：结束练习会话，但完成记录保留。
      const practice: PracticeState = this.state.practice.active
        ? { ...this.state.practice, active: null }
        : this.state.practice;
      this.commit(document, practice, '图片已载入，可以开始构图。');
    } catch (error) {
      this.patch({ phase: 'error', error: error instanceof Error ? error.message : '图片载入失败。' });
    }
  }

  loadDemo(): void {
    const document: FrameDocument = { ...structuredClone(EMPTY_DOCUMENT), image: this.imageService.demo() };
    const practice: PracticeState = this.state.practice.active
      ? { ...this.state.practice, active: null }
      : this.state.practice;
    this.commit(document, practice, '示例图片已载入。');
  }

  toggleGuide(guide: GuideKey): void {
    const document = { ...this.state.document, guides: { ...this.state.document.guides, [guide]: !this.state.document.guides[guide] } };
    this.commit(document, this.state.practice, '辅助层已更新。');
  }

  setRatio(ratio: Ratio): void {
    const image = this.state.document.image;
    if (!image) return;
    const exercise = this.activeExercise();
    if (exercise?.ratio && ratio !== exercise.ratio) {
      this.patch({ notice: `「${exercise.title}」要求使用 ${exercise.ratio} 比例，先暂停退出练习后才能更换。` });
      return;
    }
    const crop = cropForRatio(ratio, image.width / image.height, this.state.document.crop);
    this.commit({ ...this.state.document, crop }, this.state.practice, `${ratio === 'free' ? '自由' : ratio} 裁切已应用。`);
  }

  moveCrop(dx: number, dy: number): void {
    this.commit({ ...this.state.document, crop: moveCrop(this.state.document.crop, dx, dy) }, this.state.practice, '裁切位置已调整。');
  }

  resizeCrop(width: number, height: number): void {
    this.commit({ ...this.state.document, crop: resizeCrop(this.state.document.crop, width, height) }, this.state.practice, '裁切范围已调整。');
  }

  markSubject(x: number, y: number): void {
    this.commit({ ...this.state.document, subject: { x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) } }, this.state.practice, '主体标记已更新。');
  }

  saveVariant(): void {
    const id = `variant-${Date.now()}`;
    const variant = makeVariant(this.state.document.crop, id);
    const document = { ...this.state.document, variants: [...this.state.document.variants, variant].slice(-8) };
    this.commit(document, this.state.practice, `已保存裁切方案 ${document.variants.length}。`);
  }

  selectVariant(id: string): void {
    const variant = this.state.document.variants.find((item) => item.id === id);
    if (!variant) return;
    const exercise = this.activeExercise();
    if (exercise?.ratio && variant.ratio !== exercise.ratio) {
      this.patch({ notice: `「${exercise.title}」要求使用 ${exercise.ratio} 比例，该方案不适用于本次练习。` });
      return;
    }
    this.commit({ ...this.state.document, crop: { ...variant, id: 'current' } }, this.state.practice, '已切换到保存的裁切方案。');
  }

  toggleCompare(): void {
    if (this.state.practice.active) {
      this.patch({ notice: '练习进行中暂时不能打开对比，暂停退出后即可使用。' });
      return;
    }
    this.patch({ compareOpen: !this.state.compareOpen });
  }

  // ---- 构图练习 ----

  private activeExercise(): Exercise | null {
    const id = this.state.practice.active?.exerciseId;
    return id ? getExercise(id) : null;
  }

  /** 开始练习（无图片时自动载入示例图）；若已在练习中，则沿用最初的自由工作台快照。 */
  startExercise(exerciseId: ExerciseId): void {
    const exercise = getExercise(exerciseId);
    if (!exercise) return;
    let document = this.state.document;
    if (!document.image) {
      document = { ...structuredClone(EMPTY_DOCUMENT), image: this.imageService.demo() };
    }
    const snapshot = this.state.practice.active?.snapshot ?? snapshotDocument(document);
    this.beginExercise(exercise, document, snapshot);
  }

  /** 以某个快照为底，按练习要求布置辅助层、比例和初始画框。 */
  private beginExercise(exercise: Exercise, base: FrameDocument, snapshot: WorkSnapshot): void {
    const image = base.image;
    if (!image) return;
    const guides = { ...snapshot.guides, [exercise.autoGuide]: true };
    const crop = exercise.ratio
      ? cropForRatio(exercise.ratio, image.width / image.height, { ...snapshot.crop, id: 'current' })
      : { ...snapshot.crop, id: 'current' };
    const document: FrameDocument = {
      ...base,
      guides,
      subject: snapshot.subject ? { ...snapshot.subject } : null,
      crop,
      variants: snapshot.variants.map((variant) => ({ ...variant })),
    };
    const now = Date.now();
    const record: ExerciseRecord = this.state.practice.records[exercise.id] ?? { exerciseId: exercise.id, status: 'in_progress', updatedAt: now };
    const practice: PracticeState = {
      ...this.state.practice,
      active: { exerciseId: exercise.id, startedAt: now, completed: false, snapshot },
      records: { ...this.state.practice.records, [exercise.id]: { ...record, status: 'in_progress', updatedAt: now } },
      dismissedIntro: true,
    };
    this.commit(document, practice, `练习开始：${exercise.title}。${exercise.goal}`);
  }

  /** 判定通过才结算；返回是否成功。 */
  completeExercise(): boolean {
    const session = this.state.practice.active;
    const exercise = this.activeExercise();
    if (!session || !exercise) return false;
    const evaluation = evaluateExercise(exercise, { crop: this.state.document.crop, subject: this.state.document.subject });
    if (!evaluation.passed) {
      this.patch({ notice: '还有条件没达到，按右侧反馈调整，也可以跳过判定继续自由编辑。' });
      return false;
    }
    const now = Date.now();
    const previous = this.state.practice.records[exercise.id];
    const record: ExerciseRecord = {
      exerciseId: exercise.id,
      status: 'completed',
      updatedAt: now,
      completedAt: previous?.completedAt ?? now,
    };
    const practice: PracticeState = {
      ...this.state.practice,
      active: { ...session, completed: true },
      records: { ...this.state.practice.records, [exercise.id]: record },
    };
    this.commit(this.state.document, practice, `练习「${exercise.title}」完成，做得好！可以保存当前方案，或进入下一个练习。`);
    return true;
  }

  /** 暂停退出：丢弃沙盒改动，图片与方案恢复到练习前。 */
  exitExercise(): void {
    const session = this.state.practice.active;
    if (!session) return;
    const exercise = getExercise(session.exerciseId);
    const document = restoreDocument(this.state.document, session.snapshot);
    const practice: PracticeState = { ...this.state.practice, active: null };
    this.commit(document, practice, session.completed
      ? '已回到自由工作台，练习前的图片和方案保持原样。'
      : `已暂停练习「${exercise?.title ?? ''}」，进度已保留，随时可以继续。`);
  }

  /** 跳过判定：当前画面直接成为自由工作台内容，不记完成。 */
  skipExercise(): void {
    const session = this.state.practice.active;
    if (!session) return;
    const exercise = getExercise(session.exerciseId);
    const now = Date.now();
    const record: ExerciseRecord = { exerciseId: session.exerciseId, status: 'in_progress', updatedAt: now };
    const practice: PracticeState = {
      ...this.state.practice,
      active: null,
      records: { ...this.state.practice.records, [session.exerciseId]: record },
    };
    this.commit(this.state.document, practice, `已跳过「${exercise?.title ?? ''}」的判定，可以继续自由编辑；练习随时能重做。`);
  }

  /** 重做当前练习：回到练习开始时的画面。 */
  retryExercise(): void {
    const session = this.state.practice.active;
    const exercise = this.activeExercise();
    if (!session || !exercise) return;
    this.beginExercise(exercise, this.state.document, session.snapshot);
  }

  /** 进入下一个练习：以最初自由工作台快照为底，保持原方案不乱。 */
  nextExercise(nextId: ExerciseId): void {
    const exercise = getExercise(nextId);
    const session = this.state.practice.active;
    if (!exercise || !session) return;
    const base = restoreDocument(this.state.document, session.snapshot);
    this.beginExercise(exercise, base, session.snapshot);
  }

  dismissIntro(): void {
    if (this.state.practice.dismissedIntro) return;
    this.commit(this.state.document, { ...this.state.practice, dismissedIntro: true }, '');
  }
}

export function useFrameSenseViewModel(repository: FrameRepository, practiceRepository: PracticeRepository, imageService: ImageService): [FrameSenseViewModel, ViewState] {
  const [viewModel] = useState(() => new FrameSenseViewModel(repository, practiceRepository, imageService));
  const state = useSyncExternalStore(viewModel.subscribe, viewModel.getSnapshot, viewModel.getSnapshot);
  return [viewModel, state];
}
