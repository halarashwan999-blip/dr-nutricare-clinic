import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tone = 'green' | 'amber' | 'red' | 'slate' | 'blue';

const badgeTones: Record<Tone, string> = {
  green: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  amber: 'bg-amber-50 text-amber-800 border-amber-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  blue: 'bg-blue-50 text-blue-800 border-blue-200',
  slate: 'bg-muted text-muted-foreground border-border',
};

export function Badge({ children, tone = 'slate', className }: { children: ReactNode; tone?: Tone; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium', badgeTones[tone], className)}>
      {children}
    </span>
  );
}

export function SectionCard({
  title, description, action, children, className, bodyClassName,
}: {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn('card-soft flex flex-col', className)}>
      {(title || action) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 px-5 py-4 sm:px-6">
          <div>
            {title && <h2 className="text-base font-semibold text-foreground sm:text-lg">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">{description}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={cn('p-5 sm:p-6', bodyClassName)}>{children}</div>
    </section>
  );
}

export function StatCard({
  label, value, unit, hint, icon, tone = 'green',
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: Tone;
}) {
  const iconTone: Record<Tone, string> = {
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-600',
    blue: 'bg-blue-50 text-blue-700',
    slate: 'bg-muted text-muted-foreground',
  };
  return (
    <div className="card-soft flex items-start justify-between gap-3 p-4 sm:p-5">
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground sm:text-sm">{label}</p>
        <p className="mt-1.5 flex items-baseline gap-1 text-xl font-bold sm:text-2xl">
          {value}
          {unit && <span className="text-xs font-normal text-muted-foreground">{unit}</span>}
        </p>
        {hint && <p className="mt-1 text-[11px] text-muted-foreground sm:text-xs">{hint}</p>}
      </div>
      {icon && <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', iconTone[tone])}>{icon}</span>}
    </div>
  );
}

export function Field({
  label, hint, error, htmlFor, children, className,
}: {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="block text-xs font-semibold text-foreground sm:text-sm">{label}</label>
      {children}
      {error ? <p className="text-xs text-red-600">{error}</p> : hint ? <p className="text-[11px] leading-5 text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function Alert({
  tone = 'amber', title, children,
}: {
  tone?: Tone;
  title?: ReactNode;
  children: ReactNode;
}) {
  const tones: Record<Tone, string> = {
    green: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    red: 'border-red-200 bg-red-50 text-red-900',
    blue: 'border-blue-200 bg-blue-50 text-blue-900',
    slate: 'border-border bg-muted text-foreground',
  };
  return (
    <div className={cn('rounded-xl border px-4 py-3 text-xs leading-6 sm:text-sm', tones[tone])}>
      {title && <p className="mb-0.5 font-semibold">{title}</p>}
      <div>{children}</div>
    </div>
  );
}

export function EmptyState({
  icon, title, description, action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-10 text-center">
      {icon && <span className="flex size-12 items-center justify-center rounded-2xl bg-secondary text-emerald-700">{icon}</span>}
      <div>
        <p className="font-semibold">{title}</p>
        {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('size-4 animate-spin', className)} aria-hidden="true" />;
}

export function LoadingBlock({ label = 'جارٍ التحميل…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
      <Spinner /> {label}
    </div>
  );
}

export function Progress({ value, max, tone = 'green' }: { value: number; max: number; tone?: 'green' | 'amber' | 'red' }) {
  const percent = Math.max(0, Math.min(100, max > 0 ? (value / max) * 100 : 0));
  const colors = { green: 'bg-emerald-600', amber: 'bg-amber-500', red: 'bg-red-500' };
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn('h-full rounded-full transition-[width] duration-500', colors[tone])} style={{ width: `${percent}%` }} />
    </div>
  );
}

export function Modal({
  open, onClose, title, description, children, footer, size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg';
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="presentation" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={cn(
          'max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-card shadow-2xl sm:rounded-3xl',
          size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-lg',
        )}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
          <div>
            <h3 id="modal-title" className="text-base font-semibold sm:text-lg">{title}</h3>
            {description && <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">{description}</p>}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="إغلاق">
            <X className="size-5" />
          </button>
        </header>
        <div className="px-5 py-5 sm:px-6">{children}</div>
        {footer && <footer className="border-t border-border px-5 py-4 sm:px-6">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  const letters = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('');
  return (
    <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800', className)}>
      {letters || '؟'}
    </span>
  );
}
