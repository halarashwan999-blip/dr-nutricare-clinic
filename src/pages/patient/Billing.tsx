import { useState } from 'react';
import { BadgeCheck, ReceiptText, ShieldCheck, Wallet } from 'lucide-react';
import { useSession } from '@/session';
import { useApi } from '@/hooks';
import { Alert, Badge, EmptyState, LoadingBlock, Modal, SectionCard } from '@/components/ui-kit';
import { Button } from '@/components/ui/button';
import { PaymentProofForm, WalletCard } from '@/components/payment-proof';
import { daysLeft, fmtDate, fmtDateTime, fmtMoney, METHOD_LABELS, PAYMENT_LABELS, PAYMENT_STATUS_LABELS } from '@/utils';
import type { Payment, PaymentKind, PricingInfo, Subscription } from '@/types';

interface BillingResponse {
  payments: Payment[];
  subscription: Subscription | null;
  latest_subscription: Subscription | null;
  pricing: Record<PaymentKind, PricingInfo>;
}

const KIND_ORDER: PaymentKind[] = ['consultation', 'monthly', 'quarter'];

const statusTone: Record<string, 'green' | 'amber' | 'red' | 'slate'> = {
  paid: 'green',
  pending: 'amber',
  rejected: 'red',
};

export function PatientBilling() {
  const { subscription } = useSession();
  const billing = useApi<BillingResponse>('/api/billing');
  const [selected, setSelected] = useState<PaymentKind | null>(null);

  const pricing = billing.data?.pricing;
  const active = billing.data?.subscription ?? subscription;
  const payments = billing.data?.payments ?? [];
  const pending = payments.find((payment) => payment.status === 'pending') ?? null;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">الاشتراك والدفع</h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">الدفع عبر فودافون كاش، ويُفعّل الاشتراك بعد تأكيد استلام التحويل.</p>
        </div>
        <Badge tone="green"><ShieldCheck className="size-3.5" /> دفع آمن ومراجعة يدوية</Badge>
      </header>

      {pending && (
        <Alert tone="amber" title="لديك تحويل قيد المراجعة">
          {PAYMENT_LABELS[pending.kind]} · {fmtMoney(pending.amount)} · رقم العملية <span className="font-mono" dir="ltr">{pending.reference}</span>
          {' '}— يُفعّل الاشتراك بعد تأكيد الدكتورة.
        </Alert>
      )}

      <SectionCard title="حالة اشتراكك">
        {billing.loading && !billing.data ? <LoadingBlock /> : active ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold">{PAYMENT_LABELS[active.kind]} — نشط</p>
              <p className="mt-1 text-xs text-muted-foreground">من {fmtDate(active.starts_at)} إلى {fmtDate(active.ends_at)}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone="green"><BadgeCheck className="size-3.5" /> {daysLeft(active.ends_at)} يوم متبقي</Badge>
              {billing.data?.latest_subscription && billing.data.latest_subscription.id !== active.id && (
                <Badge tone="slate">آخر اشتراك منتهٍ</Badge>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <p className="text-sm text-muted-foreground">لا يوجد اشتراك متابعة نشط حاليًا. اختر باقة وأرسل تحويل فودافون كاش.</p>
            <Badge tone="amber">غير مشترك</Badge>
          </div>
        )}
      </SectionCard>

      <WalletCard />

      <div>
        <h2 className="text-sm font-bold">الباقات المتاحة</h2>
        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          {KIND_ORDER.map((kind) => {
            const plan = pricing?.[kind];
            return (
              <article key={kind} className={`card-soft flex flex-col p-5 ${kind === 'quarter' ? 'border-primary/40 ring-1 ring-primary/15' : ''}`}>
                {kind === 'quarter' && <Badge tone="amber" className="mb-2 w-fit">الأكثر توفيرًا</Badge>}
                <p className="text-xs font-semibold text-muted-foreground">{PAYMENT_LABELS[kind]}</p>
                <p className="mt-1 text-2xl font-bold">{plan ? fmtMoney(plan.amount) : '—'}</p>
                <p className="mt-1 flex-1 text-[11px] leading-5 text-muted-foreground">{plan?.note}</p>
                <Button
                  type="button"
                  className="mt-4 rounded-full"
                  variant={kind === 'quarter' ? 'default' : 'outline'}
                  onClick={() => setSelected(kind)}
                  disabled={!plan || Boolean(pending)}
                >
                  {pending ? 'بانتظار مراجعة تحويلك' : 'إرسال إثبات التحويل'}
                </Button>
              </article>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] leading-6 text-muted-foreground">
          <Wallet className="ml-1 inline size-3.5 text-emerald-700" />
          بعد التحويل أدخل رقم العملية ورقم محفظتك، ثم تنتظر تأكيد الدكتورة لتفعيل الباقة. الاستشارة الأولى لا تشمل فترة متابعة.
        </p>
      </div>

      <SectionCard title="سجل المدفوعات" description="كل التحويلات المرسلة وحالتها">
        {billing.loading && !billing.data ? <LoadingBlock /> : payments.length === 0 ? (
          <EmptyState icon={<ReceiptText className="size-5" />} title="لا توجد مدفوعات بعد" description="أول تحويل ترسله سيظهر هنا مع رقم العملية وحالته." />
        ) : (
          <div className="-mx-1 overflow-x-auto">
            <table className="table-clean w-full min-w-[620px] text-sm">
              <thead>
                <tr><th>التاريخ</th><th>الباقة</th><th>المبلغ</th><th>الطريقة</th><th>الحالة</th><th>رقم العملية</th></tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="whitespace-nowrap text-xs text-muted-foreground">{fmtDateTime(payment.created_at)}</td>
                    <td>{PAYMENT_LABELS[payment.kind]}</td>
                    <td className="font-semibold">{fmtMoney(payment.amount)}</td>
                    <td className="text-xs">{METHOD_LABELS[payment.method] ?? payment.method}</td>
                    <td><Badge tone={statusTone[payment.status] ?? 'slate'}>{PAYMENT_STATUS_LABELS[payment.status] ?? payment.status}</Badge></td>
                    <td className="font-mono text-[10px] text-muted-foreground" dir="ltr">{payment.reference}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <Modal
        open={selected != null}
        onClose={() => setSelected(null)}
        title={selected ? `تحويل ${PAYMENT_LABELS[selected]}` : ''}
        description="ادفع على رقم فودافون كاش ثم أرسل بيانات التحويل."
        footer={(
          <div className="flex justify-end">
            <Button type="button" variant="outline" className="rounded-full" onClick={() => setSelected(null)}>إغلاق</Button>
          </div>
        )}
      >
        {selected && pricing && (
          <PaymentProofForm
            kind={selected}
            amount={pricing[selected].amount}
            onSubmitted={() => billing.reload()}
          />
        )}
      </Modal>
    </div>
  );
}
