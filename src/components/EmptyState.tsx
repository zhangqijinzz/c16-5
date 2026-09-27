interface EmptyStateProps {
  onDemo: () => void;
  onStartPractice: () => void;
}

export function EmptyState({ onDemo, onStartPractice }: EmptyStateProps) {
  return (
    <section className="empty-state">
      <div className="empty-orbit" aria-hidden="true"><span /><span /><span /></div>
      <p className="eyebrow">COMPOSITION LAB / 01</p>
      <h2>先把一张照片放进画框</h2>
      <p>叠加构图辅助线，找到主体的视觉重心，再保存不同裁切版本。不知道从哪开始？跟着 4 个循序渐进的练习走一遍。</p>
      <div className="empty-actions">
        <button className="primary-button" onClick={onStartPractice}>开始构图练习</button>
        <button className="quiet-button" onClick={onDemo}>先载入示例图看看</button>
      </div>
      <span className="empty-hint">也可以从左上角导入本地图片 · 练习随时可暂停退出</span>
    </section>
  );
}
