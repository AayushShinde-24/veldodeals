export default function LeadsLoading() {
  return (
    <div className="premium-content">
      <div style={{ marginBottom: 28 }}>
        <div className="skeleton skeleton-line" style={{ width: 80, marginBottom: 8 }} />
        <div className="skeleton skeleton-line" style={{ width: 180, height: 22 }} />
      </div>
      <div className="skeleton" style={{ height: 140, borderRadius: 12, marginBottom: 20 }} />
      <div className="skeleton" style={{ borderRadius: 12, padding: 24 }}>
        {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton skeleton-row" style={{ background: "rgba(255,255,255,.06)" }} />)}
      </div>
    </div>
  );
}
