import { useId } from 'react';

export interface TrendPoint {
  label: string;
  value: number;
}

export function TrendChart({
  data, color = 'var(--site-accent)', unit = '', height = 230, minimal = false,
}: {
  data: TrendPoint[];
  color?: string;
  unit?: string;
  height?: number;
  minimal?: boolean;
}) {
  const gradientId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-dashed border-border py-10 text-xs text-muted-foreground">
        لا توجد قياسات كافية لعرض الرسم بعد.
      </div>
    );
  }

  const width = 640;
  const padding = minimal ? { top: 8, right: 8, bottom: 8, left: 8 } : { top: 16, right: 14, bottom: 30, left: 44 };
  const values = data.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const lo = min - span * 0.15;
  const hi = max + span * 0.15;
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const step = data.length > 1 ? plotWidth / (data.length - 1) : 0;
  const xAt = (index: number) => padding.left + index * step;
  const yAt = (value: number) => padding.top + ((hi - value) / (hi - lo)) * plotHeight;

  const points = data.map((point, index) => ({ ...point, x: xAt(index), y: yAt(point.value) }));
  const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
  const area = `${line} L${points.at(-1)!.x.toFixed(1)},${(height - padding.bottom).toFixed(1)} L${points[0].x.toFixed(1)},${(height - padding.bottom).toFixed(1)} Z`;

  const tickCount = 4;
  const yTicks = Array.from({ length: tickCount }, (_, index) => lo + ((hi - lo) * index) / (tickCount - 1)).reverse();

  const labelIndices = data.length <= (minimal ? 2 : 6)
    ? data.map((_, index) => index)
    : Array.from({ length: minimal ? 2 : 6 }, (_, index) => Math.round((index * (data.length - 1)) / (minimal ? 1 : 5)));

  return (
    <div dir="ltr" className="w-full" style={{ height }}>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" role="img"
        aria-label={`رسم بياني: ${data.length} قياسات، من ${min} إلى ${max}${unit ? ` ${unit}` : ''}`}>
        <defs>
          <linearGradient id={`area-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {!minimal && yTicks.map((tick) => {
          const y = yAt(tick);
          return (
            <g key={tick.toFixed(2)}>
              <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="var(--site-border)" strokeDasharray="3 6" />
              <text x={padding.left - 8} y={y + 3.5} textAnchor="end" fontSize="10.5" fill="var(--site-muted)">
                {Math.round(tick * 10) / 10}
              </text>
            </g>
          );
        })}
        <path d={area} fill={`url(#area-${gradientId})`} />
        <path d={line} fill="none" stroke={color} strokeWidth={minimal ? 2.4 : 2.8} strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => (
          <g key={`${point.label}-${index}`}>
            <circle cx={point.x} cy={point.y} r={data.length > 24 ? 2.2 : 3.6} fill="var(--site-surface)" stroke={color} strokeWidth="2">
              <title>{`${point.label}: ${point.value}${unit ? ` ${unit}` : ''}`}</title>
            </circle>
          </g>
        ))}
        {!minimal && labelIndices.map((index) => (
          <text key={index} x={xAt(index)} y={height - 10} textAnchor="middle" fontSize="10.5" fill="var(--site-muted)">
            {data[index]?.label}
          </text>
        ))}
      </svg>
    </div>
  );
}
