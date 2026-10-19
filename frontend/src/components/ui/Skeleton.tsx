import type { CSSProperties } from 'react';

interface Props {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  className?: string;
  style?: CSSProperties;
}

/** Placeholder com brilho enquanto o conteúdo carrega. */
export function Skeleton({ width, height = 14, radius, className = '', style }: Props) {
  return (
    <span
      aria-hidden
      className={`skeleton ${className}`}
      style={{ width, height, borderRadius: radius, ...style }}
    />
  );
}

export function SkeletonLines({ lines = 3, gap = 8 }: { lines?: number; gap?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton key={index} width={index === lines - 1 ? '60%' : '100%'} />
      ))}
    </div>
  );
}
