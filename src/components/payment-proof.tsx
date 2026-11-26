import { useState, type FormEvent } from 'react';
import { BadgeCheck, Copy, Smartphone, Wallet } from 'lucide-react';
import { api, errorMessage } from '@/api';
import { WALLET } from '@/site';
import { Alert, Badge, Field, Spinner } from '@/components/ui-kit';
import { Button } from '@/components/ui/button';
import { fmtMoney, PAYMENT_LABELS } from '@/utils';
import type { Payment, PaymentKind } from '@/types';

export function WalletCard({ compact = false }: { compact?: boolean }) {
  const [copied, setCopied] = useState(false);

  async function copyNumber() {
    try {
      await navigator.clipboard.writeText(WALLET.number);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className={`rounded-2xl border border-emerald-200 bg-emerald-50/70 ${compact ? 'p-4' : 'p-5'}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-10 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm"><Wallet className="size-5" /></span>
          <div>
            <p className="text-xs font-semibold text-emerald-900">الدفع عبر {WALLET.label}</p>
            <p className="text-[11px] text-emerald-800/80">باسم {WALLET.holder}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-lg font-bold tracking-wide text-emerald-900" dir="ltr">{WALLET.number}</span>
          <button
            type="button"
            onClick={() => void copyNumber()}
            className="flex items-center gap-1 rounded-full border border-emerald-300 bg-white px-2.5 py-1 text-[10px] font-semibold text-emerald-800 hover:bg-emerald-100"
          >
            <Copy className="size-3" /> {copied ? 'تم النسخ' : 'نسخ'}
          </button>
        </div>
      </div>
      {!compact && <p className="mt-3 text-[11px] leading-6 text-emerald-900/80">{WALLET.note}</p>}
    </div>
  );
}

interface ProofResponse {
  payment: Payment;
  message: string;
}

export function PaymentProofForm({
  kind, amount, onSubmitted,
}: {
  kind: PaymentKind;
  amount: number;
  onSubmitted?: (payment: Payment) => void;
}) {
  const [senderPhone, setSenderPhone] = useState('');
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ payment: Payment; message: string } | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const phone = senderPhone.replace(/[\s-]/g, '');
    if (!/^01[0125][0-9]{8}$/.test(phone)) {
      setError('أدخل رقم المحفظة التي حوّلت منها بشكل صحيح (11 رقمًا يبدأ بـ 010 أو 011 أو 012 أو 015).');
      return;
    }
    if (!/^[A-Za-z0-9-]{4,40}$/.test(reference.trim())) {
      setError('أدخل رقم عملية التحويل كما يظهر في رسالة فودافون كاش.');
      return;
    }
    setBusy(true);
    try {
      const result = await api<ProofResponse>('/api/billing/proof', {
        method: 'POST',
        idempotencyKey: crypto.randomUUID(),
        body: { kind, sender_phone: phone, reference: reference.trim().toUpperCase() },
      });
      setDone(result);
      onSubmitted?.(result.payment);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="space-y-3 text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><BadgeCheck className="size-7" /></span>
        <p className="text-sm font-semibold">تم إرسال إشعار التحويل</p>
        <p className="text-xs leading-6 text-muted-foreground">{done.message}</p>
        <p className="rounded-xl bg-muted px-3 py-2 font-mono text-xs" dir="ltr">{done.payment.reference}</p>
        <Alert tone="blue">يصلك تأكيد التفعيل في حسابك بعد مراجعة التحويل. لا تغلق الحساب، يمكنك تحديث الصفحة للتحقق.</Alert>
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={submit} noValidate>
      <WalletCard />

      <div className="rounded-2xl bg-secondary/60 px-4 py-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">الباقة المختارة</span>
          <span className="font-semibold">{PAYMENT_LABELS[kind]}</span>
        </div>
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">المبلغ المطلوب تحويله</span>
          <span className="text-lg font-bold">{fmtMoney(amount)}</span>
        </div>
      </div>

      <Field label="رقم المحفظة التي حوّلت منها" htmlFor="proof_sender" hint="الرقم المسجل على فودافون كاش الذي أرسل منه التحويل.">
        <div className="relative">
          <input
            id="proof_sender"
            type="tel"
            inputMode="numeric"
            dir="ltr"
            className="input-base pr-10 text-right"
            value={senderPhone}
            onChange={(event) => setSenderPhone(event.target.value)}
            placeholder="01000000000"
            maxLength={14}
            autoComplete="tel"
          />
          <Smartphone className="pointer-events-none absolute inset-y-0 right-3 my-auto size-4 text-muted-foreground" />
        </div>
      </Field>

      <Field label="رقم عملية التحويل" htmlFor="proof_reference" hint="رقم العملية الموجود في رسالة فودافون كاش بعد التحويل.">
        <input
          id="proof_reference"
          dir="ltr"
          className="input-base text-right font-mono"
          value={reference}
          onChange={(event) => setReference(event.target.value.toUpperCase())}
          placeholder="1234567890"
          maxLength={40}
          autoComplete="off"
        />
      </Field>

      {error && <Alert tone="red">{error}</Alert>}

      <Button type="submit" className="h-11 w-full rounded-full" disabled={busy}>
        {busy ? <Spinner className="text-primary-foreground" /> : null}
        إرسال إثبات التحويل
      </Button>
      <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
        <Badge tone="slate">مراجعة يدوية</Badge>
        يُفعّل الحساب فقط بعد تأكيد استلام المبلغ من الدكتورة.
      </p>
    </form>
  );
}
