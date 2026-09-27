import { describe, expect, it } from 'vitest';
import { evaluateExercise, EXERCISE_MAP, exerciseTargets, restoreDocument, snapshotDocument } from '../practice';
import { EMPTY_DOCUMENT } from '../model';

const cropAt = (ratio: string, x: number, y: number, width: number, height: number) => ({ id: 'current', x, y, width, height, ratio });

describe('practice evaluation', () => {
  it('thirds-free: passes when the subject sits on a thirds intersection', () => {
    const exercise = EXERCISE_MAP['thirds-free'];
    const passing = evaluateExercise(exercise, { crop: cropAt('free', 0, 0, 1, 1), subject: { x: 2 / 3, y: 1 / 3 } });
    expect(passing.passed).toBe(true);
    expect(passing.checks.every((check) => check.level === 'pass')).toBe(true);

    const far = evaluateExercise(exercise, { crop: cropAt('free', 0, 0, 1, 1), subject: { x: 0.5, y: 0.5 } });
    expect(far.passed).toBe(false);
    expect(far.checks.find((check) => check.id === 'thirds')?.level).toBe('miss');
    expect(far.checks.find((check) => check.id === 'thirds')?.detail).toContain('差');
  });

  it('thirds-free: reports near feedback with a directional hint', () => {
    const exercise = EXERCISE_MAP['thirds-free'];
    const near = evaluateExercise(exercise, { crop: cropAt('free', 0, 0, 1, 1), subject: { x: 0.4, y: 0.4 } });
    const thirds = near.checks.find((check) => check.id === 'thirds');
    expect(thirds?.level).toBe('near');
    expect(thirds?.detail).toMatch(/微调|上/);
  });

  it('thirds-free: missing and out-of-frame subjects never pass', () => {
    const exercise = EXERCISE_MAP['thirds-free'];
    expect(evaluateExercise(exercise, { crop: cropAt('free', 0.2, 0.2, 0.5, 0.5), subject: null }).passed).toBe(false);
    const outside = evaluateExercise(exercise, { crop: cropAt('free', 0.2, 0.2, 0.5, 0.5), subject: { x: 0.05, y: 0.05 } });
    expect(outside.checks.find((check) => check.id === 'thirds')?.detail).toContain('画框外');
  });

  it('thirds-45: requires the ratio, thirds placement, and coverage together', () => {
    const exercise = EXERCISE_MAP['thirds-45'];
    // 4:5 在 3:2 图上：宽 0.533，x=0.233；取左上三分交点
    const crop = cropAt('4:5', 0.2333, 0, 0.5333, 1);
    const subject = { x: 0.2333 + (1 / 3) * 0.5333, y: 1 / 3 };
    const result = evaluateExercise(exercise, { crop, subject });
    expect(result.passed).toBe(true);

    const wrongRatio = evaluateExercise(exercise, { crop: cropAt('free', 0, 0, 1, 1), subject });
    expect(wrongRatio.checks.find((check) => check.id === 'ratio')?.level).toBe('miss');

    const small = evaluateExercise(exercise, { crop: cropAt('4:5', 0.35, 0.3, 0.3, 0.3 / 0.8), subject: { x: 0.35 + 0.3 / 3, y: 0.3 + (0.3 / 0.8) / 3 } });
    const coverage = small.checks.find((check) => check.id === 'coverage');
    expect(coverage?.level).toBe('miss');
    expect(coverage?.detail).toContain('放大');
  });

  it('breathing-169: subject on a side third with open-side space passes', () => {
    const exercise = EXERCISE_MAP['breathing-169'];
    // 16:9 在 3:2 图上：高 0.84375，y=0.078125，宽满
    const crop = cropAt('16:9', 0, 0.078125, 1, 0.84375);
    const subject = { x: 1 / 3, y: 0.5 };
    const result = evaluateExercise(exercise, { crop, subject });
    expect(result.passed).toBe(true);

    // 居中主体：两侧空间相同，没有朝向感，留白判定不通过
    const centered = evaluateExercise(exercise, { crop, subject: { x: 0.5, y: 0.5 } });
    expect(centered.checks.find((check) => check.id === 'band')?.level).toBe('miss');
    expect(centered.checks.find((check) => check.id === 'breathing')?.level).toBe('miss');

    // 主体贴住所在侧的边缘：背后几乎没空间，也不通过
    const tight = evaluateExercise(exercise, { crop, subject: { x: 0.04, y: 0.5 } });
    expect(tight.checks.find((check) => check.id === 'breathing')?.level).toBe('miss');
    expect(tight.checks.find((check) => check.id === 'band')?.level).toBe('miss');
  });

  it('center-11: centered square frame with centered subject passes; off-center gets directions', () => {
    const exercise = EXERCISE_MAP['center-11'];
    // 1:1 在 3:2 图上：宽 2/3，x=1/6
    const good = evaluateExercise(exercise, { crop: cropAt('1:1', 1 / 6, 0, 2 / 3, 1), subject: { x: 0.5, y: 0.5 } });
    expect(good.passed).toBe(true);

    const offFrame = evaluateExercise(exercise, { crop: cropAt('1:1', 0, 0, 2 / 3, 1), subject: { x: 0.5, y: 0.5 } });
    expect(offFrame.checks.find((check) => check.id === 'frame-center')?.level).not.toBe('pass');
    expect(offFrame.passed).toBe(false);
  });

  it('targets move with the crop and snapshot round-trips a document', () => {
    const targets = exerciseTargets(EXERCISE_MAP['thirds-45'], cropAt('4:5', 0.2, 0.1, 0.4, 1));
    expect(targets[0]).toEqual({ x: 0.2 + 0.4 / 3, y: 0.1 + 1 / 3, kind: 'thirds' });
    expect(exerciseTargets(EXERCISE_MAP['center-11'], cropAt('1:1', 0, 0, 0.5, 0.5))[0]).toEqual({ x: 0.25, y: 0.25, kind: 'center' });

    const document = { ...structuredClone(EMPTY_DOCUMENT), subject: { x: 0.1, y: 0.2 }, crop: cropAt('16:9', 0, 0.1, 1, 0.8) };
    const snapshot = snapshotDocument(document);
    const moved = { ...document, crop: cropAt('free', 0.5, 0.5, 0.5, 0.5), subject: { x: 0.9, y: 0.9 } };
    const restored = restoreDocument(moved, snapshot);
    expect(restored.crop.ratio).toBe('16:9');
    expect(restored.subject).toEqual({ x: 0.1, y: 0.2 });
  });
});
