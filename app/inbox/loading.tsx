export default function InboxLoading() {
  return (
    <div className="premium-content">
      <div style={{ marginBottom: 28 }}>
        <div className="skeleton skeleton-line" style={{ width: 80, marginBottom: 8 }} />
        <div className="skeleton skeleton-line" style={{ width: 160, height: 22 }} />
      </div>
      <div className="grid cols-4" style={{ marginBottom: 20 }}>
        {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton skeleton-card" />)}
      </div>
      <div className="skeleton" style={{ borderRadius: 12, padding: 24 }}>
        {[0, 1, 2, 3, 4].map((i) => <div key={i} className="skeleton skeleton-row" style={{ background: "rgba(255,255,255,.06)" }} />)}
      </div>
    </div>
  );
}
