import { useState, useSyncExternalStore } from 'react';
import { cropForRatio, makeVariant, moveCrop, resizeCrop } from './domain';
import { EXERCISES, getExercise, nextExerciseId } from './exercises';
import { EMPTY_DOCUMENT, EMPTY_PRACTICE, type FrameDocument, type GuideKey, type PracticeRecord, type Ratio, type ViewState } from './model';
import type { FrameRepository, PracticeRepository } from './repository';
import type { ImageService } from './service';

type Listener = () => void;

export class FrameSenseViewModel {
  private state: ViewState = {
    phase: 'loading',
    document: structuredClone(EMPTY_DOCUMENT),
    compareOpen: false,
    notice: '',
    error: null,
    practice: structuredClone(EMPTY_PRACTICE),
  };
  private readonly listeners = new Set<Listener>();

  constructor(
    private readonly repository: FrameRepository,
    private readonly imageService: ImageService,
    private readonly practiceRepository: PracticeRepository,
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

  private persist(document: FrameDocument, notice: string): void {
    this.patch({ document, phase: 'editing', notice, error: null });
    try {
      this.repository.save(document);
    } catch {
      this.patch({ phase: 'error', error: '本地保存失败，但当前编辑仍保留在页面中。请检查浏览器存储权限。' });
    }
    this.evaluatePractice();
  }

  private evaluatePractice(): void {
    const practice = this.state.practice;
    if (!practice.activeId) return;
    const exercise = getExercise(practice.activeId);
    if (!exercise) return;
    const feedback = exercise.evaluate(this.state.document);
    let records = practice.records;
    let notice: string | null = null;
    if (feedback.status === 'done' && !records.some((record) => record.exerciseId === exercise.id)) {
      const nextRecords = [...records, { exerciseId: exercise.id, completedAt: new Date().toISOString() }];
      try {
        this.practiceRepository.save(nextRecords);
        records = nextRecords;
        notice = `练习完成：${exercise.title}。完成记录已保存。`;
      } catch {
        this.patch({ error: '练习记录保存失败，本次完成进度可能无法保留。' });
      }
    }
    this.patch({ practice: { ...this.state.practice, records, feedback }, ...(notice ? { notice } : {}) });
  }

  async initialize(): Promise<void> {
    this.patch({ phase: 'loading', notice: '正在恢复上次工作状态…', error: null });
    let records: PracticeRecord[] = [];
    try {
      records = this.practiceRepository.load();
    } catch {
      records = [];
    }
    try {
      const document = this.repository.load();
      const notice = document.image
        ? '已恢复上次工作状态'
        : records.length > 0
          ? `欢迎回来，已完成 ${records.length}/${EXERCISES.length} 课练习，可随时继续。`
          : '欢迎来到 FrameSense，先载入示例或导入图片。';
      this.patch({ document, phase: document.image ? 'editing' : 'ready', notice, practice: { ...this.state.practice, records } });
    } catch {
      this.patch({ phase: 'error', notice: '未能读取历史状态，可继续新建工作。', error: '本地数据读取失败。', practice: { ...this.state.practice, records } });
    }
  }

  async importImage(file: File): Promise<void> {
    this.patch({ phase: 'loading', notice: '正在载入图片…', error: null });
    try {
      const image = await this.imageService.readFile(file);
      const document: FrameDocument = { ...structuredClone(EMPTY_DOCUMENT), image };
      this.persist(document, '图片已载入，可以开始构图。');
    } catch (error) {
      this.patch({ phase: 'error', error: error instanceof Error ? error.message : '图片载入失败。' });
    }
  }

  loadDemo(): void {
    this.persist({ ...structuredClone(EMPTY_DOCUMENT), image: this.imageService.demo() }, '示例图片已载入。');
  }

  toggleGuide(guide: GuideKey): void {
    const document = { ...this.state.document, guides: { ...this.state.document.guides, [guide]: !this.state.document.guides[guide] } };
    this.persist(document, '辅助层已更新。');
  }

  setRatio(ratio: Ratio): void {
    const image = this.state.document.image;
    if (!image) return;
    const crop = cropForRatio(ratio, image.width / image.height, this.state.document.crop);
    this.persist({ ...this.state.document, crop }, `${ratio === 'free' ? '自由' : ratio} 裁切已应用。`);
  }

  moveCrop(dx: number, dy: number): void {
    this.persist({ ...this.state.document, crop: moveCrop(this.state.document.crop, dx, dy) }, '裁切位置已调整。');
  }

  resizeCrop(width: number, height: number): void {
    this.persist({ ...this.state.document, crop: resizeCrop(this.state.document.crop, width, height) }, '裁切范围已调整。');
  }

  markSubject(x: number, y: number): void {
    this.persist({ ...this.state.document, subject: { x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) } }, '主体标记已更新。');
  }

  saveVariant(): void {
    const id = `variant-${Date.now()}`;
    const variant = makeVariant(this.state.document.crop, id);
    const document = { ...this.state.document, variants: [...this.state.document.variants, variant].slice(-8) };
    this.persist(document, `已保存裁切方案 ${document.variants.length}。`);
  }

  selectVariant(id: string): void {
    const variant = this.state.document.variants.find((item) => item.id === id);
    if (!variant) return;
    this.persist({ ...this.state.document, crop: { ...variant, id: 'current' } }, '已切换到保存的裁切方案。');
  }

  toggleCompare(): void {
    this.patch({ compareOpen: !this.state.compareOpen });
  }

  startExercise(id: string): void {
    const exercise = getExercise(id);
    if (!exercise) return;
    let document = this.state.document;
    if (!document.image) document = { ...structuredClone(EMPTY_DOCUMENT), image: this.imageService.demo() };
    if (exercise.guide && !document.guides[exercise.guide]) {
      document = { ...document, guides: { ...document.guides, [exercise.guide]: true } };
    }
    this.patch({ compareOpen: false, practice: { ...this.state.practice, activeId: id, feedback: null } });
    this.persist(document, `练习开始：${exercise.title}。${exercise.tip}`);
  }

  exitPractice(): void {
    if (!this.state.practice.activeId) return;
    this.patch({
      practice: { ...this.state.practice, activeId: null, feedback: null },
      notice: '已退出练习，当前图片与裁切方案保持不变，可继续自由编辑。',
    });
  }

  advanceExercise(): void {
    const next = nextExerciseId(this.state.practice.activeId);
    if (next) {
      this.startExercise(next);
      return;
    }
    if (!this.state.practice.activeId) return;
    const allDone = EXERCISES.every((exercise) => this.state.practice.records.some((record) => record.exerciseId === exercise.id));
    this.patch({
      practice: { ...this.state.practice, activeId: null, feedback: null },
      notice: allDone ? '全部练习完成！当前画面保留，可继续自由创作。' : '已跳过最后一课，随时可以从练习面板继续。',
    });
  }
}

export function useFrameSenseViewModel(
  repository: FrameRepository,
  imageService: ImageService,
  practiceRepository: PracticeRepository,
): [FrameSenseViewModel, ViewState] {
  const [viewModel] = useState(() => new FrameSenseViewModel(repository, imageService, practiceRepository));
  const state = useSyncExternalStore(viewModel.subscribe, viewModel.getSnapshot, viewModel.getSnapshot);
  return [viewModel, state];
}
