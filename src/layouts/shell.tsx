import type { ReactNode } from 'react';
import {
  LayoutDashboard, UtensilsCrossed, Activity, ClipboardList, CreditCard,
  CalendarClock, UserRound, Users, Wallet, LogOut, Video, Sparkles, Ruler, MessageCircle, BadgeCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSession } from '@/session';
import { Logo } from '@/components/brand';
import { NotificationBell } from '@/components/notification-bell';
import { Avatar, Badge } from '@/components/ui-kit';
import { daysLeft, fmtDate } from '@/utils';

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const patientNav: NavItem[] = [
  { href: '/app/overview', label: 'نظرة عامة', icon: LayoutDashboard },
  { href: '/app/meals', label: 'سجل الطعام', icon: UtensilsCrossed },
  { href: '/app/vitals', label: 'القياسات', icon: Activity },
  { href: '/app/assessment', label: 'تقييمي', icon: Ruler },
  { href: '/app/plan', label: 'خطتي الغذائية', icon: ClipboardList },
  { href: '/app/appointments', label: 'المتابعة والمواعيد', icon: CalendarClock },
  { href: '/app/questions', label: 'استفساراتي', icon: MessageCircle },
  { href: '/app/billing', label: 'الاشتراك والدفع', icon: CreditCard },
  { href: '/app/profile', label: 'حسابي', icon: UserRound },
];

const clinicNav: NavItem[] = [
  { href: '/clinic/overview', label: 'نظرة عامة', icon: LayoutDashboard },
  { href: '/clinic/activations', label: 'طلبات التفعيل', icon: BadgeCheck },
  { href: '/clinic/patients', label: 'المرضى', icon: Users },
  { href: '/clinic/appointments', label: 'المتابعات', icon: CalendarClock },
  { href: '/clinic/payments', label: 'المدفوعات', icon: Wallet },
];

function isActive(path: string, href: string) {
  return path === href || path.startsWith(`${href}/`);
}

function Sidebar({ nav, path }: { nav: NavItem[]; path: string }) {
  const { user, subscription, logout } = useSession();
  const isPatient = user?.role === 'patient';
  const remaining = daysLeft(subscription?.ends_at);
  return (
    <aside className="sticky top-0 hidden h-dvh w-[268px] shrink-0 flex-col border-l border-border bg-card/70 px-4 py-6 backdrop-blur lg:flex">
      <div className="flex items-center justify-between gap-2 px-2">
        <Logo />
        {!isPatient && <NotificationBell />}
      </div>

      <nav className="mt-8 flex flex-1 flex-col gap-1" aria-label="التنقل الرئيسي">
        {nav.map((item) => {
          const active = isActive(path, item.href);
          return (
            <a
              key={item.href}
              href={`#${item.href}`}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors',
                active ? 'bg-secondary text-secondary-foreground' : 'hover:bg-muted hover:text-foreground',
              )}
            >
              <item.icon className={cn('size-[18px]', active && 'text-primary')} />
              {item.label}
            </a>
          );
        })}
      </nav>

      {isPatient && (
        <div className="mt-4 rounded-2xl border border-border bg-background/70 p-4">
          {subscription ? (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold">اشتراكك نشط</p>
                <Badge tone="green">{remaining} يوم</Badge>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">ينتهي في {fmtDate(subscription.ends_at)}</p>
            </>
          ) : (
            <>
              <p className="flex items-center gap-1.5 text-xs font-semibold"><Sparkles className="size-3.5 text-primary" /> ابدأ متابعتك</p>
              <p className="mt-1 text-[11px] leading-5 text-muted-foreground">احجز الاستشارة أو باقة المتابعة إلكترونيًا من داخل الموقع.</p>
              <a href="#/app/billing" className="mt-2.5 inline-flex text-xs font-semibold text-primary hover:underline">عرض الباقات ←</a>
            </>
          )}
        </div>
      )}

      <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
        <Avatar name={user?.name ?? '؟'} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{user?.name}</p>
          <p className="truncate text-[11px] text-muted-foreground">{isPatient ? 'متابعة أونلاين' : 'أخصائي تغذية علاجية'}</p>
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="تسجيل الخروج"
          title="تسجيل الخروج"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </aside>
  );
}

function MobileHeader({ nav, path }: { nav: NavItem[]; path: string }) {
  const { user } = useSession();
  const isDietitian = user?.role === 'dietitian';
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur lg:hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <Logo />
        <div className="flex items-center gap-2">
          {isDietitian && <NotificationBell />}
          <a href={isDietitian ? '#/clinic/overview' : '#/app/profile'} className="flex items-center gap-2" aria-label="حسابي">
            <Badge tone="green" className="hidden xs:inline-flex"><Video className="size-3" /> أونلاين</Badge>
            <Avatar name={user?.name ?? '؟'} className="size-9 text-xs" />
          </a>
        </div>
      </div>
      <nav className="scrollbar-none flex gap-1 overflow-x-auto px-3 pb-2" aria-label="التنقل">
        {nav.map((item) => {
          const active = isActive(path, item.href);
          return (
            <a
              key={item.href}
              href={`#${item.href}`}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium',
                active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
              )}
            >
              <item.icon className="size-3.5" />
              {item.label}
            </a>
          );
        })}
      </nav>
    </header>
  );
}

function Shell({ nav, path, children, footerNote }: { nav: NavItem[]; path: string; children: ReactNode; footerNote?: string }) {
  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto flex max-w-[1440px]">
        <Sidebar nav={nav} path={path} />
        <div className="min-w-0 flex-1">
          <MobileHeader nav={nav} path={path} />
          <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-9">{children}</main>
          {footerNote && (
            <p className="mx-auto max-w-6xl px-4 pb-8 text-center text-[11px] text-muted-foreground sm:px-6 lg:px-10">{footerNote}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function PatientShell({ path, children }: { path: string; children: ReactNode }) {
  return (
    <Shell nav={patientNav} path={path} footerNote="المتابعة إلكترونية بالكامل من خلال الموقع — لا توجد زيارات للعيادة.">
      {children}
    </Shell>
  );
}

export function ClinicShell({ path, children }: { path: string; children: ReactNode }) {
  return (
    <Shell nav={clinicNav} path={path} footerNote="لوحة أخصائي التغذية العلاجية — البيانات المعروضة تخص المرضى المسجلين على المنصة.">
      {children}
    </Shell>
  );
}
