import { completedCount } from '../practice';
import type { PracticeState } from '../practice';

interface PracticeNudgeProps {
  practice: PracticeState;
  total: number;
  onStart: () => void;
  onDismiss: () => void;
}

export function PracticeNudge({ practice, total, onStart, onDismiss }: PracticeNudgeProps) {
  if (practice.active || practice.dismissedIntro) return null;
  const done = completedCount(practice.records);
  return (
    <div className="practice-nudge">
      <span className="nudge-icon">✦</span>
      <div>
        <strong>{done > 0 ? `继续构图练习（已完成 ${done}/${total}）` : '第一次来？跟着练习走一遍构图'}</strong>
        <p>每个练习都有看得懂的目标和实时判定，做到位、差一点、差得远都会告诉你。练习不会锁死工作台，随时可以暂停。</p>
      </div>
      <button className="primary-button" onClick={onStart}>从「三分初见」开始</button>
      <button className="nudge-close" aria-label="不再提示" onClick={onDismiss}>×</button>
    </div>
  );
}
