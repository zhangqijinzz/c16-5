import { describe, expect, it } from 'vitest';
import { LocalFrameRepository, LocalPracticeRepository } from '../repository';
import { EMPTY_DOCUMENT } from '../model';
import type { StorageService } from '../service';

class MemoryStorage implements StorageService {
  value: string | null = null;
  read() { return this.value; }
  write(value: string) { this.value = value; }
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
    storage.value = '{ damaged';
    const document = new LocalFrameRepository(storage).load();
    expect(document.version).toBe(1);
    expect(document.image).toBeNull();
    expect(document.variants).toEqual([]);
  });
});

describe('LocalPracticeRepository', () => {
  it('saves and reloads practice records', () => {
    const storage = new MemoryStorage();
    const repository = new LocalPracticeRepository(storage);
    repository.save([{ exerciseId: 'thirds-any', completedAt: '2026-09-27T08:00:00.000Z' }]);
    const records = repository.load();
    expect(records).toHaveLength(1);
    expect(records[0]).toEqual({ exerciseId: 'thirds-any', completedAt: '2026-09-27T08:00:00.000Z' });
  });

  it('falls back to empty records for damaged or mismatched data', () => {
    const damaged = new MemoryStorage();
    damaged.value = '{ damaged';
    expect(new LocalPracticeRepository(damaged).load()).toEqual([]);
    const mismatched = new MemoryStorage();
    mismatched.value = JSON.stringify({ version: 1, records: [{ exerciseId: 42 }] });
    expect(new LocalPracticeRepository(mismatched).load()).toEqual([]);
  });
});
