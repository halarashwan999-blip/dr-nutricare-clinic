import { MEASUREMENT_GUIDE } from '@/site';

function WaistSketch() {
  return (
    <svg viewBox="0 0 220 160" className="h-36 w-full" aria-hidden="true">
      <path d="M70 18c18-8 62-8 80 0 10 4 14 18 12 34-2 18-9 23-9 40 0 16 8 22 8 34 0 12-10 20-26 20H85c-16 0-26-8-26-20 0-12 8-18 8-34 0-17-7-22-9-40-2-16 2-30 12-34Z" fill="var(--site-accent)" opacity=".08" />
      <path d="M70 18c18-8 62-8 80 0 10 4 14 18 12 34-2 18-9 23-9 40 0 16 8 22 8 34 0 12-10 20-26 20H85c-16 0-26-8-26-20 0-12 8-18 8-34 0-17-7-22-9-40-2-16 2-30 12-34Z" fill="none" stroke="var(--site-accent)" strokeWidth="2" strokeLinejoin="round" opacity=".5" />
      <path d="M55 76h110" stroke="var(--site-accent)" strokeWidth="7" strokeLinecap="round" opacity=".85" />
      <path d="M62 76v-6M78 76v-6M94 76v-6M110 76v-6M126 76v-6M142 76v-6M158 76v-6" stroke="var(--site-surface)" strokeWidth="1.6" />
      <circle cx="165" cy="76" r="4" fill="var(--site-surface)" stroke="var(--site-accent)" strokeWidth="2" />
      <path d="M168 59c10 0 18 8 18 17" stroke="var(--site-accent)" strokeWidth="2" fill="none" strokeDasharray="3 4" opacity=".7" />
      <path d="M183 82l3-6 3 6" fill="none" stroke="var(--site-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity=".7" />
      <path d="M96 126h28" stroke="var(--site-accent)" strokeWidth="2" strokeLinecap="round" opacity=".35" />
    </svg>
  );
}

function ArmSketch() {
  return (
    <svg viewBox="0 0 220 160" className="h-36 w-full" aria-hidden="true">
      <path d="M92 12c14 0 24 8 26 22l8 42c2 10-1 18 1 28 2 12 7 18 12 26 4 7 0 16-9 18-10 2-18-3-23-12l-14-26c-3-6-5-11-6-18L76 34c-1-13 5-22 16-22Z" fill="var(--site-accent)" opacity=".08" />
      <path d="M92 12c14 0 24 8 26 22l8 42c2 10-1 18 1 28 2 12 7 18 12 26 4 7 0 16-9 18-10 2-18-3-23-12l-14-26c-3-6-5-11-6-18L76 34c-1-13 5-22 16-22Z" fill="none" stroke="var(--site-accent)" strokeWidth="2" opacity=".5" />
      <path d="M72 74l56-14" stroke="var(--site-accent)" strokeWidth="7" strokeLinecap="round" opacity=".85" />
      <path d="M78 73l1.6-6M92 69l1.6-6M106 66l1.6-6M120 63l1.6-6" stroke="var(--site-surface)" strokeWidth="1.6" />
      <circle cx="128" cy="61" r="4" fill="var(--site-surface)" stroke="var(--site-accent)" strokeWidth="2" />
      <path d="M138 48c9 3 14 11 13 20" stroke="var(--site-accent)" strokeWidth="2" fill="none" strokeDasharray="3 4" opacity=".7" />
      <path d="M150 70l3-6 3 6" fill="none" stroke="var(--site-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity=".7" />
    </svg>
  );
}

export function MeasurementGuide() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <figure className="rounded-2xl border border-border bg-card p-4">
        <WaistSketch />
        <figcaption className="mt-1">
          <p className="text-sm font-semibold">محيط الخصر</p>
          <p className="mt-1 text-[11px] leading-6 text-muted-foreground">{MEASUREMENT_GUIDE.waist}</p>
        </figcaption>
      </figure>
      <figure className="rounded-2xl border border-border bg-card p-4">
        <ArmSketch />
        <figcaption className="mt-1">
          <p className="text-sm font-semibold">محيط الذراع</p>
          <p className="mt-1 text-[11px] leading-6 text-muted-foreground">{MEASUREMENT_GUIDE.arm}</p>
        </figcaption>
      </figure>
      <p className="sm:col-span-2 rounded-xl bg-muted/60 px-3 py-2.5 text-[11px] leading-6 text-muted-foreground">
        <span className="font-semibold text-foreground">الوزن:</span> {MEASUREMENT_GUIDE.weight}
        <span className="mx-1.5">·</span>
        <span className="font-semibold text-foreground">الطول:</span> {MEASUREMENT_GUIDE.height}
      </p>
    </div>
  );
}
