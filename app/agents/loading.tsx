export default function AgentsLoading() {
  return (
    <div className="premium-content">
      <div style={{ marginBottom: 28 }}>
        <div className="skeleton skeleton-line" style={{ width: 80, marginBottom: 8 }} />
        <div className="skeleton skeleton-line" style={{ width: 200, height: 22 }} />
      </div>
      <div className="grid cols-4" style={{ marginBottom: 20 }}>
        {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton skeleton-card" />)}
      </div>
      <div className="grid cols-3" style={{ gap: 12, marginBottom: 20 }}>
        {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 10 }} />)}
      </div>
      <div className="skeleton" style={{ height: 200, borderRadius: 12 }} />
    </div>
  );
}
