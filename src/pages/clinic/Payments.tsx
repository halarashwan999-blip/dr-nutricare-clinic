import { BadgeCheck, CircleDollarSign, Receipt, TrendingUp } from 'lucide-react';
import { useApi } from '@/hooks';
import { Alert, Badge, LoadingBlock, StatCard } from '@/components/ui-kit';
import { fmtDateTime, fmtMoney, METHOD_LABELS, PAYMENT_LABELS, PAYMENT_STATUS_LABELS } from '@/utils';
import type { PaymentWithPatient } from '@/types';

interface PaymentsResponse {
  payments: PaymentWithPatient[];
  total: number;
  month: number;
}

const statusTone: Record<string, 'green' | 'amber' | 'red' | 'slate'> = {
  paid: 'green',
  pending: 'amber',
  rejected: 'red',
};

export function ClinicPayments() {
  const { data, error, loading } = useApi<PaymentsResponse>('/api/admin/payments');

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">المدفوعات</h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">سجل تحويلات فودافون كاش وحالتها. الإيراد يُحتسب فقط للتحويلات المؤكدة.</p>
        </div>
        <a href="#/clinic/activations" className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100">
          <BadgeCheck className="size-3.5" /> طلبات التفعيل
        </a>
      </header>

      {error && <Alert tone="red">{error}</Alert>}

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="إيراد الشهر" value={data ? fmtMoney(data.month) : '—'} icon={<TrendingUp className="size-5" />} hint="التحويلات المؤكدة فقط" />
        <StatCard label="الإجمالي" value={data ? fmtMoney(data.total) : '—'} icon={<CircleDollarSign className="size-5" />} tone="blue" />
        <StatCard label="عدد العمليات" value={data ? data.payments.length.toLocaleString('en-US') : '—'} icon={<Receipt className="size-5" />} tone="amber" />
      </div>

      {loading && !data ? <LoadingBlock /> : !data || data.payments.length === 0 ? (
        <p className="text-xs text-muted-foreground">لا توجد مدفوعات مسجلة.</p>
      ) : (
        <div className="card-soft overflow-x-auto">
          <table className="w-full min-w-[760px] text-right text-xs">
            <thead>
              <tr className="border-b border-border text-[11px] text-muted-foreground">
                <th className="px-4 py-3 font-medium">المريض</th>
                <th className="px-4 py-3 font-medium">الباقة</th>
                <th className="px-4 py-3 font-medium">المبلغ</th>
                <th className="px-4 py-3 font-medium">الطريقة</th>
                <th className="px-4 py-3 font-medium">الحالة</th>
                <th className="px-4 py-3 font-medium">رقم العملية</th>
                <th className="px-4 py-3 font-medium">من محفظة</th>
                <th className="px-4 py-3 font-medium">التاريخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {data.payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <a href={`#/clinic/patients/${payment.user_id}`} className="font-semibold hover:text-primary hover:underline">{payment.patient?.name ?? 'مريض'}</a>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{PAYMENT_LABELS[payment.kind]}</td>
                  <td className="px-4 py-3 font-semibold">{fmtMoney(payment.amount)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{METHOD_LABELS[payment.method] ?? payment.method}</td>
                  <td className="px-4 py-3"><Badge tone={statusTone[payment.status] ?? 'slate'}>{PAYMENT_STATUS_LABELS[payment.status] ?? payment.status}</Badge></td>
                  <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground" dir="ltr">{payment.reference}</td>
                  <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground" dir="ltr">{payment.sender_phone ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{fmtDateTime(payment.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
