export const ChatListSkeleton = () => (
  <div className="chat-list-panel">
    <div className="chat-list-header">
      <div className="skeleton skeleton-avatar" />
      <div className="skeleton skeleton-line" style={{ width: 100 }} />
    </div>
    {[1, 2, 3, 4].map(i => (
      <div key={i} className="chat-item">
        <div className="skeleton skeleton-avatar" />
        <div className="chat-item-info">
          <div className="skeleton skeleton-line" style={{ width: '60%' }} />
          <div className="skeleton skeleton-line" style={{ width: '80%', height: 10 }} />
        </div>
      </div>
    ))}
  </div>
);