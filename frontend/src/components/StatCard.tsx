export function StatCard({ label, value, hint, accent }: { label: string; value: number | string; hint?: string; accent?: string }) {
  return (
    <div className="panel stat" style={accent ? ({ '--accent': accent } as React.CSSProperties) : undefined}>
      <div className="stat-value">{value}</div>
      <div>
        <div className="stat-label">{label}</div>
        {hint && <div className="stat-hint">{hint}</div>}
      </div>
    </div>
  );
}
