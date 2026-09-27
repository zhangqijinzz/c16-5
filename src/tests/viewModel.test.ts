import { beforeEach, describe, expect, it } from 'vitest';
import { FrameSenseViewModel } from '../viewModel';
import { EMPTY_DOCUMENT, type FrameDocument, type ImageAsset } from '../model';
import { EMPTY_PRACTICE, type PracticeState } from '../practice';
import type { FrameRepository } from '../repository';
import type { PracticeRepository } from '../practiceRepository';
import type { ImageService } from '../service';

class MemoryRepository implements FrameRepository {
  document: FrameDocument = structuredClone(EMPTY_DOCUMENT);
  fail = false;
  load() { return structuredClone(this.document); }
  save(document: FrameDocument) { if (this.fail) throw new Error('no storage'); this.document = structuredClone(document); }
}

class MemoryPracticeRepository implements PracticeRepository {
  state: PracticeState = structuredClone(EMPTY_PRACTICE);
  fail = false;
  load() { return structuredClone(this.state); }
  save(state: PracticeState) { if (this.fail) throw new Error('no storage'); this.state = structuredClone(state); }
}

class FakeImageService implements ImageService {
  asset: ImageAsset = { src: 'data:image/svg+xml,test', width: 1200, height: 800, name: 'test.svg' };
  readFile() { return Promise.resolve(this.asset); }
  demo() { return this.asset; }
}

describe('FrameSenseViewModel', () => {
  let repository: MemoryRepository;
  let practiceRepository: MemoryPracticeRepository;
  let vm: FrameSenseViewModel;
  beforeEach(() => {
    repository = new MemoryRepository();
    practiceRepository = new MemoryPracticeRepository();
    vm = new FrameSenseViewModel(repository, practiceRepository, new FakeImageService());
  });

  it('initializes empty and loads a demo image', async () => {
    await vm.initialize();
    expect(vm.getSnapshot().phase).toBe('ready');
    vm.loadDemo();
    expect(vm.getSnapshot().document.image?.name).toBe('test.svg');
    expect(repository.document.image).not.toBeNull();
  });

  it('updates guides, subject, ratio, and variants', () => {
    vm.loadDemo();
    vm.toggleGuide('center');
    vm.markSubject(0.2, 0.8);
    vm.setRatio('1:1');
    vm.saveVariant();
    expect(vm.getSnapshot().document.guides.center).toBe(true);
    expect(vm.getSnapshot().document.subject).toEqual({ x: 0.2, y: 0.8 });
    expect(vm.getSnapshot().document.crop.ratio).toBe('1:1');
    expect(vm.getSnapshot().document.variants).toHaveLength(1);
  });

  it('keeps edits in memory and reports persistence failure', () => {
    repository.fail = true;
    vm.loadDemo();
    expect(vm.getSnapshot().phase).toBe('error');
    expect(vm.getSnapshot().document.image).not.toBeNull();
    expect(vm.getSnapshot().error).toContain('本地保存失败');
  });

  describe('composition practice', () => {
    it('starts an exercise on the demo image, locks ratio, and records progress', () => {
      vm.startExercise('thirds-45');
      const state = vm.getSnapshot();
      expect(state.document.image).not.toBeNull();
      expect(state.document.crop.ratio).toBe('4:5');
      expect(state.document.guides.thirds).toBe(true);
      expect(state.practice.active?.exerciseId).toBe('thirds-45');
      expect(practiceRepository.state.records['thirds-45']?.status).toBe('in_progress');

      vm.setRatio('16:9');
      expect(vm.getSnapshot().document.crop.ratio).toBe('4:5');
    });

    it('restores the original workspace on pause/exit, keeping records', () => {
      vm.loadDemo();
      vm.markSubject(0.2, 0.2);
      vm.setRatio('16:9');
      vm.saveVariant();
      const before = vm.getSnapshot().document;

      vm.startExercise('center-11');
      expect(vm.getSnapshot().document.crop.ratio).toBe('1:1');
      vm.markSubject(0.9, 0.9);
      vm.exitExercise();

      const after = vm.getSnapshot().document;
      expect(after.crop.ratio).toBe('16:9');
      expect(after.subject).toEqual(before.subject);
      expect(after.guides).toEqual(before.guides);
      expect(after.variants).toHaveLength(1);
      expect(vm.getSnapshot().practice.active).toBeNull();
      expect(practiceRepository.state.records['center-11']?.status).toBe('in_progress');
    });

    it('only completes when every check passes and stores the completed record', () => {
      vm.startExercise('center-11');
      // 默认 1:1 画框在宽图中水平居中、垂直满高，中心即 (0.5, 0.5)，面积 2/3，满足全部条件
      vm.markSubject(0.5, 0.5);
      expect(vm.completeExercise()).toBe(true);
      expect(vm.getSnapshot().practice.active?.completed).toBe(true);
      expect(practiceRepository.state.records['center-11']?.status).toBe('completed');
      expect(practiceRepository.state.records['center-11']?.completedAt).toBeTypeOf('number');
    });

    it('refuses completion when a check misses and explains it', () => {
      vm.startExercise('center-11');
      vm.markSubject(0.1, 0.1);
      expect(vm.completeExercise()).toBe(false);
      expect(vm.getSnapshot().notice).toContain('跳过判定');
      expect(practiceRepository.state.records['center-11']?.status).toBe('in_progress');
    });

    it('skip-judging keeps the current frame but does not complete the record', () => {
      vm.startExercise('thirds-free');
      vm.markSubject(0.15, 0.15);
      vm.skipExercise();
      const state = vm.getSnapshot();
      expect(state.practice.active).toBeNull();
      expect(state.document.subject).toEqual({ x: 0.15, y: 0.15 });
      expect(practiceRepository.state.records['thirds-free']?.status).toBe('in_progress');
    });

    it('retry resets the sandbox to the start of the exercise', () => {
      vm.startExercise('center-11');
      vm.markSubject(0.4, 0.4);
      vm.moveCrop(0.2, 0);
      vm.retryExercise();
      const state = vm.getSnapshot();
      expect(state.practice.active?.exerciseId).toBe('center-11');
      expect(state.document.subject).toBeNull();
      expect(state.document.crop.x).toBeCloseTo(1 / 6);
    });

    it('survives reload: an active session resumes with the sandbox intact', async () => {
      vm.startExercise('thirds-free');
      vm.markSubject(0.34, 0.34);

      const reloaded = new FrameSenseViewModel(repository, practiceRepository, new FakeImageService());
      await reloaded.initialize();
      expect(reloaded.getSnapshot().practice.active?.exerciseId).toBe('thirds-free');
      expect(reloaded.getSnapshot().document.subject).toEqual({ x: 0.34, y: 0.34 });
    });

    it('abandoning practice while importing a new image keeps completed records', () => {
      vm.startExercise('center-11');
      vm.markSubject(0.5, 0.5);
      vm.completeExercise();
      void vm.importImage(new File(['x'], 'new.jpg', { type: 'image/jpeg' }));
      const state = vm.getSnapshot();
      expect(state.phase).toBe('loading');
      expect(practiceRepository.state.records['center-11']?.status).toBe('completed');
    });
  });
});
