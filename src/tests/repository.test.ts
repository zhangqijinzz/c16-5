import { describe, expect, it } from 'vitest';
import { LocalFrameRepository } from '../repository';
import { LocalPracticeRepository } from '../practiceRepository';
import { EMPTY_DOCUMENT } from '../model';
import { EMPTY_PRACTICE } from '../practice';
import type { StorageService } from '../service';

class MemoryStorage implements StorageService {
  doc: string | null = null;
  practice: string | null = null;
  read() { return this.doc; }
  write(value: string) { this.doc = value; }
  readPractice() { return this.practice; }
  writePractice(value: string) { this.practice = value; }
}

describe('LocalFrameRepository', () => {
  it('saves and reloads the versioned document', () => {
    const storage = new MemoryStorage();
    const repository = new LocalFrameRepository(storage);
    const document = { ...structuredClone(EMPTY_DOCUMENT), subject: { x: 0.4, y: 0.6 } };
    repository.save(document);
    expect(repository.load().subject).toEqual({ x: 0.4, y: 0.6 });
  });

  it('falls back to a usable empty document for damaged data', () => {
    const storage = new MemoryStorage();
    storage.doc = '{ damaged';
    const document = new LocalFrameRepository(storage).load();
    expect(document.version).toBe(1);
    expect(document.image).toBeNull();
    expect(document.variants).toEqual([]);
  });

  it('keeps document and practice records in separate keys', () => {
    const storage = new MemoryStorage();
    const frameRepo = new LocalFrameRepository(storage);
    const practiceRepo = new LocalPracticeRepository(storage);
    frameRepo.save({ ...structuredClone(EMPTY_DOCUMENT), subject: { x: 0.1, y: 0.1 } });
    const practice = { ...structuredClone(EMPTY_PRACTICE), dismissedIntro: true, records: { 'center-11': { exerciseId: 'center-11' as const, status: 'completed' as const, updatedAt: 3, completedAt: 3 } } };
    practiceRepo.save(practice);
    expect(practiceRepo.load().records['center-11']?.status).toBe('completed');
    expect(frameRepo.load().subject).toEqual({ x: 0.1, y: 0.1 });
  });

  it('falls back to empty practice state for damaged data', () => {
    const storage = new MemoryStorage();
    storage.practice = '{ broken';
    const state = new LocalPracticeRepository(storage).load();
    expect(state.version).toBe(1);
    expect(state.records).toEqual({});
    expect(state.active).toBeNull();
  });
});
