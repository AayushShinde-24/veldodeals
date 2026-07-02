export default function DashboardLoading() {
  return (
    <div className="premium-content">
      <div style={{ marginBottom: 28 }}>
        <div className="skeleton skeleton-line" style={{ width: 120, marginBottom: 8 }} />
        <div className="skeleton skeleton-line" style={{ width: 220, height: 22 }} />
      </div>
      <div className="grid cols-4" style={{ marginBottom: 20 }}>
        {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton skeleton-card" />)}
      </div>
      <div className="grid cols-4" style={{ marginBottom: 20 }}>
        {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton skeleton-card" />)}
      </div>
      <div className="skeleton" style={{ height: 240, borderRadius: 12 }} />
    </div>
  );
}
