import { beforeEach, describe, expect, it } from 'vitest';
import { FrameSenseViewModel } from '../viewModel';
import { EMPTY_DOCUMENT, type FrameDocument, type ImageAsset, type PracticeRecord } from '../model';
import type { FrameRepository, PracticeRepository } from '../repository';
import type { ImageService } from '../service';

class MemoryRepository implements FrameRepository {
  document: FrameDocument = structuredClone(EMPTY_DOCUMENT);
  fail = false;
  load() { return structuredClone(this.document); }
  save(document: FrameDocument) { if (this.fail) throw new Error('no storage'); this.document = structuredClone(document); }
}

class MemoryPracticeRepository implements PracticeRepository {
  records: PracticeRecord[] = [];
  fail = false;
  load() { return structuredClone(this.records); }
  save(records: PracticeRecord[]) { if (this.fail) throw new Error('no storage'); this.records = structuredClone(records); }
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
    vm = new FrameSenseViewModel(repository, new FakeImageService(), practiceRepository);
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

  it('starts an exercise with a demo image and the suggested guide', () => {
    vm.startExercise('thirds-any');
    const state = vm.getSnapshot();
    expect(state.document.image).not.toBeNull();
    expect(state.document.guides.thirds).toBe(true);
    expect(state.practice.activeId).toBe('thirds-any');
    expect(state.practice.feedback?.status).toBe('far');
  });

  it('evaluates edits live and records completion exactly once', () => {
    vm.startExercise('thirds-any');
    vm.markSubject(1 / 3, 1 / 3);
    expect(vm.getSnapshot().practice.feedback?.status).toBe('done');
    expect(vm.getSnapshot().practice.records).toHaveLength(1);
    expect(practiceRepository.records).toHaveLength(1);
    vm.markSubject(0.5, 0.5);
    expect(vm.getSnapshot().practice.feedback?.status).toBe('far');
    vm.markSubject(1 / 3, 1 / 3);
    expect(vm.getSnapshot().practice.records).toHaveLength(1);
  });

  it('keeps the image and variants untouched when exiting practice', () => {
    vm.loadDemo();
    vm.saveVariant();
    const imageBefore = vm.getSnapshot().document.image;
    vm.startExercise('thirds-any');
    vm.markSubject(0.2, 0.2);
    vm.moveCrop(0.1, 0.1);
    vm.exitPractice();
    const state = vm.getSnapshot();
    expect(state.practice.activeId).toBeNull();
    expect(state.practice.feedback).toBeNull();
    expect(state.document.image).toEqual(imageBefore);
    expect(state.document.variants).toHaveLength(1);
  });

  it('skips to the next exercise without recording anything', () => {
    vm.startExercise('thirds-any');
    vm.advanceExercise();
    expect(vm.getSnapshot().practice.activeId).toBe('thirds-target');
    expect(vm.getSnapshot().practice.records).toHaveLength(0);
  });

  it('exits practice after the last exercise', () => {
    vm.startExercise('decisive-crop');
    vm.advanceExercise();
    expect(vm.getSnapshot().practice.activeId).toBeNull();
  });

  it('restores practice records across sessions', async () => {
    practiceRepository.records = [{ exerciseId: 'thirds-any', completedAt: new Date(0).toISOString() }];
    await vm.initialize();
    expect(vm.getSnapshot().practice.records).toHaveLength(1);
    expect(vm.getSnapshot().practice.records[0].exerciseId).toBe('thirds-any');
  });

  it('keeps the workbench usable when practice record saving fails', () => {
    practiceRepository.fail = true;
    vm.startExercise('thirds-any');
    vm.markSubject(1 / 3, 1 / 3);
    const state = vm.getSnapshot();
    expect(state.practice.feedback?.status).toBe('done');
    expect(state.error).toContain('练习记录保存失败');
    expect(state.phase).not.toBe('error');
  });
});
