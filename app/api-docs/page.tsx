export default function ApiDocsPage() {
  return (
    <main className="premium-content">
      <section className="premium-section">
        <p className="eyebrow">Developer API</p>
        <h1>Veldo API</h1>
        <p>Use scoped API keys as Bearer tokens. The OpenAPI document is available at <code>/api/v1/openapi</code>.</p>
      </section>
      <section className="premium-section">
        <h2>Endpoints</h2>
        <ul>
          <li><code>GET /api/v1/campaigns</code> requires <code>campaigns:read</code>.</li>
          <li><code>GET /api/v1/usage</code> requires <code>usage:read</code>.</li>
        </ul>
      </section>
    </main>
  );
}
