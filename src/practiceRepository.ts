import { EMPTY_PRACTICE, isPracticeState, type PracticeState } from './practice';
import type { StorageService } from './service';

export interface PracticeRepository {
  load(): PracticeState;
  save(state: PracticeState): void;
}

export class LocalPracticeRepository implements PracticeRepository {
  constructor(private readonly storage: StorageService) {}

  load(): PracticeState {
    const raw = this.storage.readPractice();
    if (!raw) return structuredClone(EMPTY_PRACTICE);
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!isPracticeState(parsed)) return structuredClone(EMPTY_PRACTICE);
      return {
        ...EMPTY_PRACTICE,
        ...parsed,
        records: parsed.records ?? {},
      };
    } catch {
      return structuredClone(EMPTY_PRACTICE);
    }
  }

  save(state: PracticeState): void {
    this.storage.writePractice(JSON.stringify(state));
  }
}
