import { isFrameDocument, isPracticeLog } from './domain';
import { EMPTY_DOCUMENT, type FrameDocument, type PracticeLog, type PracticeRecord } from './model';
import type { StorageService } from './service';

export interface FrameRepository {
  load(): FrameDocument;
  save(document: FrameDocument): void;
}

export class LocalFrameRepository implements FrameRepository {
  constructor(private readonly storage: StorageService) {}

  load(): FrameDocument {
    const raw = this.storage.read();
    if (!raw) return structuredClone(EMPTY_DOCUMENT);
    try {
      const parsed: unknown = JSON.parse(raw);
      return isFrameDocument(parsed) ? parsed : structuredClone(EMPTY_DOCUMENT);
    } catch {
      return structuredClone(EMPTY_DOCUMENT);
    }
  }

  save(document: FrameDocument): void {
    this.storage.write(JSON.stringify(document));
  }
}

export interface PracticeRepository {
  load(): PracticeRecord[];
  save(records: PracticeRecord[]): void;
}

export class LocalPracticeRepository implements PracticeRepository {
  constructor(private readonly storage: StorageService) {}

  load(): PracticeRecord[] {
    const raw = this.storage.read();
    if (!raw) return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      return isPracticeLog(parsed) ? parsed.records : [];
    } catch {
      return [];
    }
  }

  save(records: PracticeRecord[]): void {
    const log: PracticeLog = { version: 1, records };
    this.storage.write(JSON.stringify(log));
  }
}
