export default function AnalyticsLoading() {
  return (
    <div className="premium-content">
      <div style={{ marginBottom: 28 }}>
        <div className="skeleton skeleton-line" style={{ width: 100, marginBottom: 8 }} />
        <div className="skeleton skeleton-line" style={{ width: 190, height: 22 }} />
      </div>
      <div className="grid cols-4" style={{ marginBottom: 20 }}>
        {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton skeleton-card" />)}
      </div>
      <div className="grid cols-2" style={{ gap: 20 }}>
        <div className="skeleton" style={{ height: 200, borderRadius: 12 }} />
        <div className="skeleton" style={{ height: 200, borderRadius: 12 }} />
      </div>
    </div>
  );
}
