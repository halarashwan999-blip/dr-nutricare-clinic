import { HeartPulse, Scale, Droplets, Activity, TrendingUp, Gauge } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ConditionId } from '@/types';

export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm', className)}>
      <svg viewBox="0 0 32 32" className="size-6" aria-hidden="true" fill="none">
        <path d="M16 27c-6.2 0-10.5-4.1-10.5-9.6 0-4.6 3-8.4 7.4-8.4 1.7 0 3.2.6 4.4 1.7 1.1-1.1 2.7-1.7 4.3-1.7 4.5 0 7.4 3.8 7.4 8.4C29 22.9 22.2 27 16 27Z" fill="currentColor" opacity=".18" />
        <path d="M16 25.5c-5.4 0-9-3.6-9-8.1 0-3.9 2.5-7 6-7 1.5 0 2.9.6 3.9 1.6l-3.3 6.4 4.3-4.5c.6-.6 1.3-1 2.1-1 3.6 0 6 3.1 6 7 0 4.5-3.6 8.1-9 8.1" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="m4 16.5 3.4-2.7 2.8 2.6L14 9l3.4 9.4 2.6-2.3 3 1.6 4.8-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity=".9" />
      </svg>
    </span>
  );
}

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <a href="#/" className={cn('inline-flex items-center gap-2.5', className)} aria-label="Dr. NutriCare Clinic — الصفحة الرئيسية">
      <BrandMark />
      {!compact && (
        <span className="leading-tight">
          <span dir="ltr" className="block whitespace-nowrap text-base font-bold tracking-tight text-foreground">Dr. NutriCare Clinic</span>
          <span className="block text-[10px] font-medium text-muted-foreground">عيادة تغذية علاجية أونلاين</span>
        </span>
      )}
    </a>
  );
}

export const CONDITION_ICONS: Record<ConditionId, typeof HeartPulse> = {
  obesity: Scale,
  underweight: TrendingUp,
  heart: HeartPulse,
  hypertension: Activity,
  diabetes: Droplets,
  thyroid: Gauge,
};
