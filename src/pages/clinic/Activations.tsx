import { useState } from 'react';
import { BadgeCheck, MessageCircle, Phone, ShieldCheck, XCircle, Wallet } from 'lucide-react';
import { useApi } from '@/hooks';
import { api, errorMessage } from '@/api';
import { Alert, Badge, EmptyState, LoadingBlock, Modal, SectionCard, Spinner } from '@/components/ui-kit';
import { Button } from '@/components/ui/button';
import { fmtDateTime, fmtMoney, PAYMENT_LABELS } from '@/utils';
import type { PaymentWithPatient } from '@/types';

interface PaymentsResponse {
  payments: PaymentWithPatient[];
  total: number;
  month: number;
}

export function ClinicActivations() {
  const { data, error, loading, reload } = useApi<PaymentsResponse>('/api/admin/payments?status=pending');
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<PaymentWithPatient | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [done, setDone] = useState<string | null>(null);

  async function confirm(payment: PaymentWithPatient) {
    setActionError(null);
    setBusy(payment.id);
    try {
      const result = await api<{ message: string }>(`/api/admin/payments/${payment.id}/confirm`, { method: 'POST' });
      setDone(result.message);
      reload();
    } catch (reason) {
      setActionError(errorMessage(reason));
    } finally {
      setBusy(null);
    }
  }

  async function reject() {
    if (!rejecting) return;
    setActionError(null);
    setBusy(rejecting.id);
    try {
      await api(`/api/admin/payments/${rejecting.id}/reject`, { method: 'POST', body: { note: rejectNote.trim() } });
      setRejecting(null);
      setRejectNote('');
      reload();
    } catch (reason) {
      setActionError(errorMessage(reason));
    } finally {
      setBusy(null);
    }
  }

  const payments = data?.payments ?? [];

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">طلبات التفعيل</h1>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          تحويلات فودافون كاش التي أرسلها المرضى. راجع رقم العملية في محفظتك ثم أكّد استلام المبلغ لتفعيل الحساب والاشتراك.
        </p>
      </header>

      {done && <Alert tone="green">{done}</Alert>}
      {(error || actionError) && <Alert tone="red">{actionError ?? error}</Alert>}

      {loading && !data ? <LoadingBlock /> : payments.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck className="size-5" />}
          title="لا توجد تحويلات بانتظار المراجعة"
          description="سيصلك إشعار فور إرسال أي مريض لإثبات تحويل جديد."
        />
      ) : (
        <div className="space-y-3">
          {payments.map((payment) => {
            const phone = payment.patient?.phone ?? null;
            return (
              <article key={payment.id} className="card-soft p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <a href={`#/clinic/patients/${payment.user_id}`} className="text-sm font-bold hover:text-primary hover:underline">
                        {payment.patient?.name ?? 'مريض'}
                      </a>
                      <Badge tone="amber">بانتظار التأكيد</Badge>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">{fmtDateTime(payment.created_at)}</p>
                  </div>
                  <p className="text-sm font-bold">{PAYMENT_LABELS[payment.kind]} · {fmtMoney(payment.amount)}</p>
                </div>

                <dl className="mt-3 grid gap-2 text-[11px] sm:grid-cols-3">
                  <div className="rounded-xl bg-muted/60 px-3 py-2">
                    <dt className="text-muted-foreground">رقم عملية التحويل</dt>
                    <dd className="mt-0.5 font-mono font-semibold" dir="ltr">{payment.reference}</dd>
                  </div>
                  <div className="rounded-xl bg-muted/60 px-3 py-2">
                    <dt className="text-muted-foreground">من محفظة</dt>
                    <dd className="mt-0.5 font-mono font-semibold" dir="ltr">{payment.sender_phone ?? '—'}</dd>
                  </div>
                  <div className="rounded-xl bg-muted/60 px-3 py-2">
                    <dt className="text-muted-foreground">هاتف المريض</dt>
                    <dd className="mt-0.5 font-mono font-semibold" dir="ltr">{phone ?? '—'}</dd>
                  </div>
                </dl>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button type="button" size="sm" className="rounded-full" onClick={() => void confirm(payment)} disabled={busy !== null}>
                    {busy === payment.id ? <Spinner className="text-primary-foreground" /> : <BadgeCheck className="size-3.5" />}
                    تأكيد الاستلام وتفعيل الحساب
                  </Button>
                  <Button type="button" size="sm" variant="outline" className="rounded-full text-red-600 hover:bg-red-50" onClick={() => { setRejecting(payment); setRejectNote(''); }} disabled={busy !== null}>
                    <XCircle className="size-3.5" /> رفض التحويل
                  </Button>
                  {phone && (
                    <>
                      <a href={`https://wa.me/${phone.replace(/^0/, '20')}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100">
                        <MessageCircle className="size-3.5" /> واتساب
                      </a>
                      <a href={`tel:${phone}`} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-[11px] font-semibold text-muted-foreground hover:bg-muted">
                        <Phone className="size-3.5" /> اتصال
                      </a>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <SectionCard title="كيف يتم التأكيد؟">
        <ul className="space-y-2 text-xs leading-6 text-muted-foreground">
          <li className="flex gap-2"><Wallet className="mt-1 size-3.5 shrink-0 text-emerald-700" /> افتح رسائل فودافون كاش وتأكد من وصول المبلغ ورقم العملية ورقم المحفظة المرسل.</li>
          <li className="flex gap-2"><BadgeCheck className="mt-1 size-3.5 shrink-0 text-primary" /> عند الضغط على «تأكيد الاستلام» يُسجّل الدفع كمدفوع ويُفعّل الحساب ويبدأ الاشتراك تلقائيًا حسب الباقة.</li>
          <li className="flex gap-2"><XCircle className="mt-1 size-3.5 shrink-0 text-red-600" /> عند الرفض يبقى الحساب غير مفعّل، ويظهر للمريض سبب الرفض لإعادة الإرسال.</li>
        </ul>
      </SectionCard>

      <Modal
        open={Boolean(rejecting)}
        onClose={() => { if (!busy) setRejecting(null); }}
        title="رفض التحويل"
        description={rejecting ? `${rejecting.patient?.name ?? 'المريض'} · رقم العملية ${rejecting.reference}` : ''}
        footer={(
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" className="rounded-full" onClick={() => setRejecting(null)} disabled={busy !== null}>إلغاء</Button>
            <Button type="button" className="rounded-full bg-red-600 px-6 text-white hover:bg-red-700" onClick={() => void reject()} disabled={busy !== null}>
              {busy ? <Spinner className="text-white" /> : <XCircle className="size-4" />} تأكيد الرفض
            </Button>
          </div>
        )}
      >
        <label htmlFor="reject_note" className="text-xs font-semibold">سبب الرفض (اختياري)</label>
        <textarea
          id="reject_note"
          className="input-base mt-2 min-h-24 resize-y py-2.5 text-sm"
          value={rejectNote}
          onChange={(event) => setRejectNote(event.target.value)}
          maxLength={300}
          placeholder="مثال: لم يصل المبلغ على المحفظة، أو رقم العملية غير مطابق."
        />
      </Modal>
    </div>
  );
}
