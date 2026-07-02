export default function CrmLoading() {
  return (
    <div className="premium-content">
      <div style={{ marginBottom: 28 }}>
        <div className="skeleton skeleton-line" style={{ width: 90, marginBottom: 8 }} />
        <div className="skeleton skeleton-line" style={{ width: 170, height: 22 }} />
      </div>
      <div className="grid cols-4" style={{ marginBottom: 20 }}>
        {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton skeleton-card" />)}
      </div>
      <div className="grid cols-4" style={{ gap: 12 }}>
        {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 260, borderRadius: 10 }} />)}
      </div>
    </div>
  );
}
