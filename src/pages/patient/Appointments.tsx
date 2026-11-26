import { useState, type FormEvent } from 'react';
import { CalendarClock, CalendarPlus, Clock, Video } from 'lucide-react';
import { useSession } from '@/session';
import { useApi } from '@/hooks';
import { api, errorMessage } from '@/api';
import { Alert, Badge, EmptyState, LoadingBlock, SectionCard, Spinner } from '@/components/ui-kit';
import { Button } from '@/components/ui/button';
import { APPOINTMENT_LABELS, fmtDateTime, STATUS_LABELS, daysLeft, fmtDate, toLocalDateTimeInput } from '@/utils';
import type { Appointment, AppointmentKind } from '@/types';

const STATUS_TONE: Record<string, 'green' | 'amber' | 'red' | 'slate'> = {
  requested: 'amber',
  confirmed: 'green',
  completed: 'slate',
  cancelled: 'red',
};

export function PatientAppointments() {
  const { subscription } = useSession();
  const { data, error, loading, reload } = useApi<Appointment[]>('/api/appointments');

  const [kind, setKind] = useState<AppointmentKind>('monthly');
  const [scheduledAt, setScheduledAt] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const min = toLocalDateTimeInput(new Date(Date.now() + 30 * 60000));
  const max = toLocalDateTimeInput(new Date(Date.now() + 170 * 86400000));
  const list = data ?? [];
  const upcoming = list.filter((item) => ['requested', 'confirmed'].includes(item.status) && Date.parse(item.scheduled_at) > Date.now() - 3600000);
  const past = list.filter((item) => !upcoming.includes(item));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setNotice(null);
    if (!scheduledAt) {
      setFormError('اختر تاريخ ووقت الموعد.');
      return;
    }
    setBusy(true);
    try {
      await api<Appointment>('/api/appointments', {
        method: 'POST',
        body: {
          kind,
          scheduled_at: new Date(scheduledAt).toISOString(),
          patient_note: note.trim() ? note.trim() : undefined,
        },
      });
      setScheduledAt('');
      setNote('');
      setNotice('تم إرسال طلب الموعد. سيؤكده الأخصائي ويضيف رابط المتابعة في هذه الصفحة.');
      reload();
    } catch (reason) {
      setFormError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">المتابعة والمواعيد</h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">احجز موعدك، وتابع رابط الجلسة الإلكترونية هنا بعد التأكيد.</p>
        </div>
        <Badge tone="green"><Video className="size-3.5" /> متابعة إلكترونية فقط</Badge>
      </header>

      <Alert tone="blue" title="لا توجد زيارات للعيادة">
        كل المتابعات تُجرى أونلاين عبر رابط مكالمة يضيفه الأخصائي بعد تأكيد الموعد. تأكد من توفر اتصال إنترنت هادئ قبل الموعد بخمس دقائق.
      </Alert>

      <div className="grid gap-4 lg:grid-cols-[1fr_.9fr]">
        <SectionCard title="مواعيدك" description={loading ? 'جارٍ التحميل…' : `${upcoming.length} موعد قادم`}>
          {error && <Alert tone="red">{error}</Alert>}
          {loading && !data ? <LoadingBlock /> : list.length === 0 ? (
            <EmptyState icon={<CalendarClock className="size-5" />} title="لا توجد مواعيد بعد" description="اطلب أول موعد من النموذج المجاور." />
          ) : (
            <div className="space-y-5">
              {upcoming.length > 0 && (
                <div>
                  <h3 className="mb-2 text-xs font-bold text-muted-foreground">قادمة</h3>
                  <ul className="space-y-2.5">
                    {upcoming.map((item) => (
                      <li key={item.id} className="rounded-2xl border border-border bg-card p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold">{APPOINTMENT_LABELS[item.kind]}</p>
                            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><Clock className="size-3.5" /> {fmtDateTime(item.scheduled_at)}</p>
                          </div>
                          <Badge tone={STATUS_TONE[item.status]}>{STATUS_LABELS[item.status]}</Badge>
                        </div>
                        {item.patient_note && <p className="mt-2 rounded-lg bg-muted/60 px-3 py-2 text-[11px] leading-5 text-muted-foreground">ملاحظتك: {item.patient_note}</p>}
                        {item.meeting_link ? (
                          <a href={item.meeting_link} target="_blank" rel="noreferrer" className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">
                            <Video className="size-3.5" /> دخول المتابعة الإلكترونية
                          </a>
                        ) : (
                          <p className="mt-3 text-[11px] text-muted-foreground">سيظهر رابط المتابعة بعد تأكيد الأخصائي.</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {past.length > 0 && (
                <div>
                  <h3 className="mb-2 text-xs font-bold text-muted-foreground">السجل</h3>
                  <ul className="divide-y divide-border/70">
                    {past.map((item) => (
                      <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                        <div>
                          <p className="text-xs font-medium">{APPOINTMENT_LABELS[item.kind]} · {fmtDateTime(item.scheduled_at)}</p>
                          {item.meeting_link && <a href={item.meeting_link} target="_blank" rel="noreferrer" className="text-[10px] text-primary hover:underline">رابط الجلسة</a>}
                        </div>
                        <Badge tone={STATUS_TONE[item.status]}>{STATUS_LABELS[item.status]}</Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </SectionCard>

        <div className="space-y-4">
          <SectionCard title="طلب موعد" description="اختر نوع المتابعة والوقت المناسب. الطلبات تُراجع من الأخصائي.">
            {subscription ? (
              <p className="mb-3 rounded-xl bg-secondary/60 px-3 py-2 text-[11px] text-secondary-foreground">اشتراكك نشط — متبقي {daysLeft(subscription.ends_at)} يوم حتى {fmtDate(subscription.ends_at)}.</p>
            ) : (
              <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-900">لا يوجد اشتراك نشط. يمكنك طلب موعد، لكن يُنصح باختيار باقة من صفحة الاشتراك.</p>
            )}
            <form onSubmit={submit} className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" htmlFor="appt-kind">نوع المتابعة</label>
                <select id="appt-kind" className="input-base select-base" value={kind} onChange={(event) => setKind(event.target.value as AppointmentKind)}>
                  <option value="consultation">استشارة أولى</option>
                  <option value="monthly">متابعة شهرية</option>
                  <option value="plan_review">مراجعة الخطة</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" htmlFor="appt-time">التاريخ والوقت</label>
                <input id="appt-time" type="datetime-local" className="input-base" value={scheduledAt} min={min} max={max} onChange={(event) => setScheduledAt(event.target.value)} required />
                <p className="text-[10px] text-muted-foreground">بتوقيت جهازك المحلي.</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" htmlFor="appt-note">ما الذي تريد مناقشته؟ (اختياري)</label>
                <textarea id="appt-note" className="input-base min-h-24 resize-y py-2.5" value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} placeholder="مثال: ثبات الوزن آخر أسبوعين، وأريد تعديل وجبة العشاء." />
              </div>
              {formError && <Alert tone="red">{formError}</Alert>}
              {notice && <Alert tone="green">{notice}</Alert>}
              <Button type="submit" className="w-full rounded-full" disabled={busy}>
                {busy ? <Spinner className="text-primary-foreground" /> : <CalendarPlus className="size-4" />} إرسال طلب الموعد
              </Button>
            </form>
          </SectionCard>

          <p className="rounded-2xl border border-border bg-card px-4 py-3 text-[11px] leading-5 text-muted-foreground">
            إذا احتجت تغيير الموعد، أرسل استفسارًا للأخصائي من صفحة الاستفسارات وسيُحدَّث الموعد في حسابك.
          </p>
        </div>
      </div>
    </div>
  );
}
