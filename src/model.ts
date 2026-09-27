export type GuideKey = 'thirds' | 'center' | 'diagonal' | 'golden';
export type Phase = 'loading' | 'ready' | 'editing' | 'error';
export type Ratio = 'free' | '1:1' | '4:5' | '16:9';

export interface ImageAsset {
  src: string;
  width: number;
  height: number;
  name: string;
}

export interface CropVariant {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  ratio: string;
}

export interface FrameDocument {
  version: 1;
  image: ImageAsset | null;
  guides: Record<GuideKey, boolean>;
  subject: { x: number; y: number } | null;
  crop: CropVariant;
  variants: CropVariant[];
}

export type ExerciseStatus = 'done' | 'close' | 'far';

export interface ExerciseFeedback {
  status: ExerciseStatus;
  message: string;
}

export interface PracticeRecord {
  exerciseId: string;
  completedAt: string;
}

export interface PracticeLog {
  version: 1;
  records: PracticeRecord[];
}

export interface PracticeState {
  activeId: string | null;
  records: PracticeRecord[];
  feedback: ExerciseFeedback | null;
}

export interface ViewState {
  phase: Phase;
  document: FrameDocument;
  compareOpen: boolean;
  notice: string;
  error: string | null;
  practice: PracticeState;
}

export const DEFAULT_CROP: CropVariant = {
  id: 'current',
  x: 0,
  y: 0,
  width: 1,
  height: 1,
  ratio: 'free',
};

export const EMPTY_DOCUMENT: FrameDocument = {
  version: 1,
  image: null,
  guides: { thirds: true, center: false, diagonal: false, golden: false },
  subject: null,
  crop: DEFAULT_CROP,
  variants: [],
};

export const EMPTY_PRACTICE: PracticeState = {
  activeId: null,
  records: [],
  feedback: null,
};
