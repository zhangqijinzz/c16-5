import type { Exercise, ExerciseEvaluation } from '../practice';

interface ExercisePanelProps {
  exercise: Exercise;
  step: number;
  total: number;
  completed: boolean;
  hasNext: boolean;
  evaluation: ExerciseEvaluation;
  onComplete: () => void;
  onNext: () => void;
  onSkip: () => void;
  onExit: () => void;
  onRetry: () => void;
}

const LEVEL_TEXT: Record<'pass' | 'near' | 'miss', string> = { pass: '达标', near: '接近', miss: '未达' };

export function ExercisePanel({ exercise, step, total, completed, hasNext, evaluation, onComplete, onNext, onSkip, onExit, onRetry }: ExercisePanelProps) {
  const passedCount = evaluation.checks.filter((check) => check.level === 'pass').length;
  return (
    <section className="variants-panel exercise-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">PRACTICE / {String(step).padStart(2, '0')} OF {String(total).padStart(2, '0')}</p>
          <h3>{exercise.title}</h3>
        </div>
        <button className="exercise-exit quiet-button" onClick={onExit} title="暂停并返回自由工作台">暂停退出</button>
      </div>

      <div className="exercise-goal">
        <span>目标</span>
        <p>{exercise.goal}</p>
      </div>

      <p className="exercise-brief">{exercise.brief}</p>

      <div className="exercise-progress">
        <div className="exercise-progress-track"><i style={{ width: `${(passedCount / evaluation.checks.length) * 100}%` }} /></div>
        <small>{passedCount}/{evaluation.checks.length} 项达标</small>
      </div>

      <ul className="check-list">
        {evaluation.checks.map((check) => (
          <li key={check.id} className={`check-item ${check.level}`}>
            <span className="check-mark">{check.level === 'pass' ? '✓' : check.level === 'near' ? '≈' : '·'}</span>
            <div>
              <strong>{check.label}<em>{LEVEL_TEXT[check.level]}</em></strong>
              <p>{check.detail}</p>
            </div>
          </li>
        ))}
      </ul>

      {completed ? (
        <div className="exercise-success">
          <p><span>✦</span> 练习完成，构图很到位！</p>
          <div className="exercise-success-actions">
            {hasNext ? <button className="primary-button" onClick={onNext}>下一个练习 →</button> : <button className="primary-button" onClick={onExit}>返回自由工作台</button>}
            <button className="quiet-button" onClick={onRetry}>再练一次</button>
          </div>
          <small>完成前的图片与方案原封不动，返回工作台即可继续。</small>
        </div>
      ) : (
        <div className="exercise-actions">
          <button className="primary-button" onClick={onComplete}>判定完成</button>
          <div className="exercise-secondary">
            <button onClick={onRetry}>重新开始</button>
            <button onClick={onSkip}>跳过判定</button>
          </div>
          <small>跳过判定不会记为完成，但会保留当前画面，工作台随时可用。</small>
        </div>
      )}

      <div className="exercise-tips">
        <div className="section-label"><span>操作提示</span><small>HINTS</small></div>
        <ul>
          {exercise.tips.map((tip, index) => <li key={index}>{tip}</li>)}
        </ul>
      </div>
    </section>
  );
}
