import { useEffect, useState } from 'react';
import { ArrowLeft, Clock, LogOut, RefreshCw, ShieldCheck } from 'lucide-react';
import { useSession } from '@/session';
import { useApi } from '@/hooks';
import { Logo } from '@/components/brand';
import { PaymentProofForm, WalletCard } from '@/components/payment-proof';
import { Alert, Badge, LoadingBlock, SectionCard } from '@/components/ui-kit';
import { Button } from '@/components/ui/button';
import { fmtDateTime, fmtMoney, PAYMENT_LABELS, PAYMENT_STATUS_LABELS } from '@/utils';
import type { Payment, PaymentKind, PricingInfo, Subscription } from '@/types';

interface BillingResponse {
  payments: Payment[];
  subscription: Subscription | null;
  latest_subscription: Subscription | null;
  pricing: Record<PaymentKind, PricingInfo>;
}

const KIND_ORDER: PaymentKind[] = ['consultation', 'monthly', 'quarter'];

export function PatientActivation() {
  const { user, logout, refresh } = useSession();
  const billing = useApi<BillingResponse>('/api/billing');
  const [kind, setKind] = useState<PaymentKind>('consultation');

  useEffect(() => {
    const timer = window.setInterval(() => { void refresh().catch(() => undefined); }, 20000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const payments = billing.data?.payments ?? [];
  const pending = payments.find((payment) => payment.status === 'pending') ?? null;
  const rejected = payments.find((payment) => payment.status === 'rejected') ?? null;
  const pricing = billing.data?.pricing;

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
          <Logo />
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground sm:inline">{user?.name}</span>
            <button
              type="button"
              onClick={() => void logout()}
              className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <LogOut className="size-3.5" /> خروج
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-5 px-4 py-8 sm:px-6 lg:py-12">
        <div className="text-center">
          <Badge tone="amber"><Clock className="size-3.5" /> بانتظار التفعيل</Badge>
          <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">أهلًا {user?.name} — حسابك بانتظار تفعيل الدفع</h1>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-muted-foreground">
            للدخول إلى المتابعة الكاملة (سجل الطعام، القياسات، الخطة الغذائية، والمواعيد) حوّلي قيمة الباقة على فودافون كاش
            ثم أرسلي رقم العملية هنا. تُراجع الدكتورة التحويل وتُفعّل حسابك يدويًا بعد التأكد.
          </p>
        </div>

        <ol className="grid gap-3 sm:grid-cols-3">
          {[
            { title: 'حوّلي المبلغ', text: 'على رقم محفظة فودافون كاش الموضح بالأسفل.' },
            { title: 'أرسلي رقم العملية', text: 'مع رقم المحفظة التي حوّلتِ منها داخل النموذج.' },
            { title: 'انتظري التأكيد', text: 'يُفعّل الحساب بعد مراجعة التحويل، وتتحدث الصفحة تلقائيًا.' },
          ].map((step, index) => (
            <li key={step.title} className="card-soft p-4">
              <span className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{index + 1}</span>
              <p className="mt-2.5 text-sm font-semibold">{step.title}</p>
              <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{step.text}</p>
            </li>
          ))}
        </ol>

        {billing.error && <Alert tone="red">{billing.error}</Alert>}

        {pending ? (
          <SectionCard
            title="تحويلك قيد المراجعة"
            description="لا حاجة لإرسال تحويل جديد. يُفعّل الحساب فور تأكيد الدكتورة."
            action={<button type="button" onClick={() => billing.reload()} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"><RefreshCw className="size-3.5" /> تحديث</button>}
          >
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-amber-900">{PAYMENT_LABELS[pending.kind]} · {fmtMoney(pending.amount)}</p>
                  <p className="mt-1 text-[11px] text-amber-800">أُرسل في {fmtDateTime(pending.created_at)}</p>
                </div>
                <Badge tone="amber">{PAYMENT_STATUS_LABELS[pending.status] ?? pending.status}</Badge>
              </div>
              <dl className="mt-3 grid gap-2 text-[11px] sm:grid-cols-2">
                <div className="rounded-xl bg-white/70 px-3 py-2">
                  <dt className="text-amber-800">رقم عملية التحويل</dt>
                  <dd className="mt-0.5 font-mono font-semibold text-amber-950" dir="ltr">{pending.reference}</dd>
                </div>
                <div className="rounded-xl bg-white/70 px-3 py-2">
                  <dt className="text-amber-800">من محفظة</dt>
                  <dd className="mt-0.5 font-mono font-semibold text-amber-950" dir="ltr">{pending.sender_phone ?? '—'}</dd>
                </div>
              </dl>
            </div>
            <div className="mt-4">
              <WalletCard compact />
            </div>
          </SectionCard>
        ) : (
          <SectionCard title="اختر الباقة وأرسل التحويل" description="الأسعار بالجنيه المصري وتُدفع عبر فودافون كاش.">
            {rejected && (
              <Alert tone="red" title="لم يُقبل آخر تحويل">
                {rejected.review_note ? `${rejected.review_note} — ` : ''}تأكد من رقم العملية والمبلغ ثم أرسل التحويل من جديد.
              </Alert>
            )}
            {billing.loading && !billing.data ? <LoadingBlock /> : (
              <div className="mt-3 space-y-4">
                <div className="grid gap-2 sm:grid-cols-3">
                  {KIND_ORDER.map((option) => {
                    const plan = pricing?.[option];
                    const active = kind === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setKind(option)}
                        aria-pressed={active}
                        className={`rounded-2xl border px-4 py-3 text-right transition-colors ${active ? 'border-primary bg-secondary' : 'border-border hover:bg-muted'}`}
                      >
                        <span className="block text-xs font-semibold">{plan?.label ?? PAYMENT_LABELS[option]}</span>
                        <span className="mt-1 block text-lg font-bold">{plan ? fmtMoney(plan.amount) : '—'}</span>
                        <span className="mt-0.5 block text-[10px] text-muted-foreground">{plan?.note}</span>
                      </button>
                    );
                  })}
                </div>
                {pricing && <PaymentProofForm key={kind} kind={kind} amount={pricing[kind].amount} onSubmitted={() => billing.reload()} />}
              </div>
            )}
          </SectionCard>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card/70 px-4 py-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-primary" /> بيانات حسابك ومدفوعاتك محفوظة ولا تُحذف أثناء انتظار التفعيل.</span>
          <a href="#/" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">العودة للصفحة الرئيسية <ArrowLeft className="size-3.5" /></a>
        </div>
      </main>
    </div>
  );
}
