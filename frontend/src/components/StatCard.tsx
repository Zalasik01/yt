import { FadeIn } from './ui/motion';
import { Skeleton } from './ui/Skeleton';

export function StatCard({ label, value, hint, accent, index = 0, loading = false }: { label: string; value: number | string; hint?: string; accent?: string; index?: number; loading?: boolean }) {
  return (
    <FadeIn index={index}>
      <div className="panel stat" style={accent ? ({ '--accent': accent } as React.CSSProperties) : undefined}>
        {loading ? (
          <>
            <Skeleton width={42} height={34} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Skeleton width={120} height={11} />
              <Skeleton width={90} height={12} />
            </div>
          </>
        ) : (
          <>
            <div className="stat-value">{value}</div>
            <div>
              <div className="stat-label">{label}</div>
              {hint && <div className="stat-hint">{hint}</div>}
            </div>
          </>
        )}
      </div>
    </FadeIn>
  );
}
