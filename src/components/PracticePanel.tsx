import { EXERCISES, getExercise } from '../exercises';
import type { ExerciseStatus, PracticeState } from '../model';

interface PracticePanelProps {
  practice: PracticeState;
  hasImage: boolean;
  onStart: (id: string) => void;
  onExit: () => void;
  onAdvance: () => void;
}

const STATUS_LABEL: Record<ExerciseStatus, string> = {
  done: '做到位了',
  close: '接近了',
  far: '还差得远',
};

const STATUS_TITLE: Record<ExerciseStatus, string> = {
  done: '判定通过',
  close: '继续微调',
  far: '继续调整',
};

export function PracticePanel({ practice, hasImage, onStart, onExit, onAdvance }: PracticePanelProps) {
  const active = practice.activeId ? getExercise(practice.activeId) : undefined;

  if (!active) {
    const doneCount = practice.records.length;
    return (
      <section className="practice-panel">
        <div className="practice-head">
          <div>
            <p className="eyebrow">PRACTICE / 构图练习</p>
            <h2>跟着 {EXERCISES.length} 节课练一遍构图</h2>
          </div>
          <span className="practice-progress">已完成 {doneCount} / {EXERCISES.length}</span>
        </div>
        <ol className="practice-list">
          {EXERCISES.map((exercise, index) => {
            const done = practice.records.some((record) => record.exerciseId === exercise.id);
            return (
              <li key={exercise.id} className={done ? 'done' : ''}>
                <span className="practice-index">{done ? '✓' : String(index + 1).padStart(2, '0')}</span>
                <div>
                  <strong>{exercise.title}</strong>
                  <small>{exercise.goal}</small>
                </div>
                <button onClick={() => onStart(exercise.id)}>{done ? '再练一次' : '开始'}</button>
              </li>
            );
          })}
        </ol>
        <p className="practice-note">
          每节课都有明确目标和实时判定，随时可以跳过或退出，原来的图片和裁切方案不会受影响{hasImage ? '。' : '；开始第一节课会自动载入示例图。'}
        </p>
      </section>
    );
  }

  const index = EXERCISES.findIndex((exercise) => exercise.id === active.id);
  const isLast = index === EXERCISES.length - 1;
  const status = practice.feedback?.status ?? 'far';
  return (
    <section className={`practice-panel active ${status}`}>
      <div className="practice-head">
        <div>
          <p className="eyebrow">第 {index + 1} 课 / 共 {EXERCISES.length} 课</p>
          <h2>{active.title}</h2>
        </div>
        <span className={`practice-status ${status}`}>{STATUS_LABEL[status]}</span>
      </div>
      <p className="practice-goal">{active.goal}</p>
      <ul className="practice-criteria">
        {active.criteria.map((criterion) => <li key={criterion}>{criterion}</li>)}
      </ul>
      <div className="practice-feedback" role="status">
        <strong>{STATUS_TITLE[status]}</strong>
        <span>{practice.feedback?.message ?? '开始调整画面，这里会实时给出反馈。'}</span>
      </div>
      <div className="practice-actions">
        {status === 'done' ? (
          <>
            <button className="primary-button" onClick={onAdvance}>{isLast ? '完成全部练习' : '下一课 →'}</button>
            <button className="quiet-button" onClick={onExit}>回到自由工作台</button>
          </>
        ) : (
          <>
            <button className="quiet-button" onClick={onAdvance}>跳过此课</button>
            <button className="quiet-button" onClick={onExit}>退出练习</button>
          </>
        )}
      </div>
      <p className="practice-note">判定实时进行；跳过或退出都不会影响当前图片与已保存的方案。</p>
    </section>
  );
}
