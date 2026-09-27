import { describe, expect, it } from 'vitest';
import { EXERCISES, getExercise, nextExerciseId } from '../exercises';
import { EMPTY_DOCUMENT, type FrameDocument } from '../model';

const base = (): FrameDocument => structuredClone(EMPTY_DOCUMENT);
const withSubject = (x: number, y: number): FrameDocument => ({ ...base(), subject: { x, y } });
const evaluate = (id: string, document: FrameDocument) => {
  const exercise = getExercise(id);
  if (!exercise) throw new Error(`unknown exercise ${id}`);
  return exercise.evaluate(document);
};

describe('exercise catalog', () => {
  it('offers a progressive sequence of four exercises', () => {
    expect(EXERCISES.map((exercise) => exercise.id)).toEqual(['thirds-any', 'thirds-target', 'breathing-room', 'decisive-crop']);
    expect(nextExerciseId('thirds-any')).toBe('thirds-target');
    expect(nextExerciseId('decisive-crop')).toBeNull();
    expect(nextExerciseId('missing')).toBeNull();
  });

  it('describes every exercise with a readable goal and criteria', () => {
    for (const exercise of EXERCISES) {
      expect(exercise.title.length).toBeGreaterThan(0);
      expect(exercise.goal.length).toBeGreaterThan(0);
      expect(exercise.criteria.length).toBeGreaterThan(0);
    }
  });
});

describe('thirds-any exercise', () => {
  it('asks for a subject first', () => {
    expect(evaluate('thirds-any', base()).status).toBe('far');
  });

  it('passes near any third intersection', () => {
    expect(evaluate('thirds-any', withSubject(1 / 3 + 0.02, 1 / 3)).status).toBe('done');
    expect(evaluate('thirds-any', withSubject(2 / 3, 2 / 3 - 0.03)).status).toBe('done');
  });

  it('recognizes near-miss and far-off positions', () => {
    expect(evaluate('thirds-any', withSubject(1 / 3 + 0.08, 1 / 3)).status).toBe('close');
    expect(evaluate('thirds-any', withSubject(0.5, 0.5)).status).toBe('far');
  });
});

describe('thirds-target exercise', () => {
  it('only passes near the right-top intersection', () => {
    expect(evaluate('thirds-target', withSubject(2 / 3, 1 / 3)).status).toBe('done');
    expect(evaluate('thirds-target', withSubject(1 / 3, 1 / 3)).status).toBe('far');
  });

  it('guides directionally when close', () => {
    const feedback = evaluate('thirds-target', withSubject(2 / 3 + 0.07, 1 / 3));
    expect(feedback.status).toBe('close');
    expect(feedback.message).toContain('左');
  });
});

describe('breathing-room exercise', () => {
  const crop45 = { id: 'current', x: 0.2, y: 0.1, width: 0.6, height: 0.75, ratio: '4:5' };

  it('requires the 4:5 ratio first', () => {
    expect(evaluate('breathing-room', withSubject(0.5, 0.5)).status).toBe('far');
  });

  it('requires the subject inside the crop', () => {
    const document = { ...withSubject(0.05, 0.5), crop: crop45 };
    expect(evaluate('breathing-room', document).status).toBe('far');
  });

  it('passes with generous margins on every side', () => {
    const document = { ...withSubject(0.5, 0.45), crop: crop45 };
    expect(evaluate('breathing-room', document).status).toBe('done');
  });

  it('reports the tightest side', () => {
    const tightLeft = { ...withSubject(0.2 + 0.08 * 0.6, 0.45), crop: crop45 };
    const feedback = evaluate('breathing-room', tightLeft);
    expect(feedback.status).toBe('close');
    expect(feedback.message).toContain('左侧');
    const touchingTop = { ...withSubject(0.5, 0.1 + 0.01 * 0.75), crop: crop45 };
    expect(evaluate('breathing-room', touchingTop).status).toBe('far');
  });
});

describe('decisive-crop exercise', () => {
  const cropOf = (width: number, height: number) => ({ id: 'current', x: (1 - width) / 2, y: (1 - height) / 2, width, height, ratio: 'free' });

  it('keeps the subject inside the crop', () => {
    const document = { ...withSubject(0.05, 0.05), crop: cropOf(0.5, 0.5) };
    expect(evaluate('decisive-crop', document).status).toBe('far');
  });

  it('passes in the 35%–65% area band with the subject kept', () => {
    const document = { ...withSubject(0.5, 0.5), crop: cropOf(0.7, 0.7) };
    expect(evaluate('decisive-crop', document).status).toBe('done');
  });

  it('pushes back when the crop is too timid or too tight', () => {
    expect(evaluate('decisive-crop', { ...withSubject(0.5, 0.5), crop: cropOf(1, 1) }).status).toBe('far');
    expect(evaluate('decisive-crop', { ...withSubject(0.5, 0.5), crop: cropOf(0.9, 0.8) }).status).toBe('close');
    expect(evaluate('decisive-crop', { ...withSubject(0.5, 0.5), crop: cropOf(0.6, 0.5) }).status).toBe('close');
    expect(evaluate('decisive-crop', { ...withSubject(0.5, 0.5), crop: cropOf(0.3, 0.3) }).status).toBe('far');
  });
});
