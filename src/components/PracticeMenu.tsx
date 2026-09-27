import { EXERCISES, type ActiveSession, type ExerciseRecord, type ExerciseId } from '../practice';

interface PracticeMenuProps {
  records: Record<string, ExerciseRecord>;
  active: ActiveSession | null;
  onStart: (id: ExerciseId) => void;
}

function statusOf(record: ExerciseRecord | undefined): { text: string; className: string } {
  if (!record) return { text: '未开始', className: 'todo' };
  if (record.status === 'completed') return { text: '已完成', className: 'done' };
  if (record.status === 'skipped') return { text: '已跳过', className: 'skipped' };
  return { text: '进行中', className: 'doing' };
}

export function PracticeMenu({ records, active, onStart }: PracticeMenuProps) {
  return (
    <div className="control-group practice-menu">
      <div className="section-label"><span>构图练习</span><small>PRACTICE</small></div>
      <div className="practice-list">
        {EXERCISES.map((exercise) => {
          const record = records[exercise.id];
          const status = statusOf(record);
          const isActive = active?.exerciseId === exercise.id;
          return (
            <button key={exercise.id} className={`practice-item ${status.className} ${isActive ? 'active' : ''}`} onClick={() => onStart(exercise.id)}>
              <span className="practice-order">{String(exercise.order).padStart(2, '0')}</span>
              <span className="practice-name"><strong>{exercise.title}</strong><small>{exercise.ratio ? `比例 ${exercise.ratio}` : '比例不限'}</small></span>
              <em>{isActive ? '继续' : status.text}</em>
            </button>
          );
        })}
      </div>
      <p className="practice-note">练习在独立沙盒里进行，暂停退出后工作台恢复原样，记录会保存在本地。</p>
    </div>
  );
}
