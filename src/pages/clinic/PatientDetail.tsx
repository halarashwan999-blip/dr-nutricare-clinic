import { useState } from 'react';
import {
  Activity, ArrowRight, CalendarClock, CheckCircle2, ClipboardList, Droplets, HeartPulse, Mail,
  MessageCircle, Phone, Plus, Ruler, Save, Scale, Target, Video, Wallet, XCircle,
} from 'lucide-react';
import { useApi } from '@/hooks';
import { api, errorMessage } from '@/api';
import { assessHealth } from '@/assessment';
import { Badge, EmptyState, LoadingBlock, Modal, SectionCard, Spinner, StatCard } from '@/components/ui-kit';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui-kit';
import { TrendChart } from '@/components/TrendChart';
import { CONTACT } from '@/site';
import {
  ageFromYear, APPOINTMENT_LABELS, bmiBand, bmiOf, bpBand, CONDITION_LABELS, daysLeft,
  fmtDate, fmtDateTime, fmtMoney, fmtShort, glucoseBand, MEAL_LABELS, METHOD_LABELS,
  PAYMENT_LABELS, STATUS_LABELS,
} from '@/utils';
import type { AppointmentStatus, InbodyReport, PatientDetail } from '@/types';
import { PlanManager } from './PlanManager';
import { QuestionsPanel } from './QuestionsPanel';

const statusTone: Record<AppointmentStatus, 'green' | 'amber' | 'blue' | 'slate'> = {
  requested: 'amber',
  confirmed: 'green',
  completed: 'blue',
  cancelled: 'slate',
};

function InbodyGallery({ patientId }: { patientId: string }) {
  const photos = useApi<InbodyReport[]>(`/api/admin/patients/${patientId}/inbody`);
  const items = photos.data ?? [];
  return (
    <SectionCard title="صور قراءة InBody" description={items.length ? `${items.length} صورة مرفوعة` : 'لم ترفع المريضة صورًا بعد'}>
      {photos.loading && !photos.data ? <LoadingBlock /> : items.length === 0 ? (
        <p className="text-xs leading-6 text-muted-foreground">
          تظهر هنا صور قراءة جهاز InBody التي يرفعها المريض من صفحة «قياساتك وتقييم حالتك». يُفضّل تشجيع المريض على تصوير القراءة مع كل قياس.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {items.map((item) => (
            <li key={item.id} className="overflow-hidden rounded-xl border border-border bg-card">
              <a href={`/functions/v1/app/api/inbody/${item.id}/image`} target="_blank" rel="noreferrer" className="block">
                <img
                  src={`/functions/v1/app/api/inbody/${item.id}/image`}
                  alt={`قراءة InBody — ${fmtDate(item.taken_at)}`}
                  loading="lazy"
                  className="aspect-[4/3] w-full bg-muted object-cover"
                />
              </a>
              <div className="p-2">
                <p className="text-[11px] font-semibold">{fmtDate(`${item.taken_at}T00:00:00`)}</p>
                {item.note && <p className="truncate text-[10px] text-muted-foreground">{item.note}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

export function ClinicPatientDetail({ id }: { id: string }) {
  const { data, error, loading, reload } = useApi<PatientDetail>(`/api/admin/patients/${id}`);
  const [noteBody, setNoteBody] = useState('');
  const [noteBusy, setNoteBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [activateBusy, setActivateBusy] = useState<string | null>(null);
  const [meetingFor, setMeetingFor] = useState<string | null>(null);
  const [meetingLink, setMeetingLink] = useState('');
  const [apptBusy, setApptBusy] = useState<string | null>(null);

  if (loading && !data) return <LoadingBlock label="جارٍ تحميل ملف المريض…" />;
  if (error || !data) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-600">{error ?? 'تعذر تحميل الملف.'}</p>
        <a href="#/clinic/patients" className="text-xs font-semibold text-primary hover:underline">العودة إلى المرضى</a>
      </div>
    );
  }

  const { patient, vitals, meals, notes, questions, appointments, payments, subscription, latest_subscription } = data;
  const conditions = patient.conditions?.length ? patient.conditions : (patient.condition ? [patient.condition] : []);
  const latestWeight = vitals.find((item) => item.weight_kg != null);
  const latestBp = vitals.find((item) => item.systolic != null && item.diastolic != null);
  const latestGlucose = vitals.find((item) => item.glucose != null);
  const bmi = bmiOf(latestWeight?.weight_kg ?? null, patient.height_cm);
  const bmiInfo = bmiBand(bmi);
  const assessment = assessHealth({
    weight: latestWeight?.weight_kg ?? null,
    height: patient.height_cm,
    waist: patient.waist_cm,
    arm: patient.arm_cm,
    gender: patient.gender,
    conditions,
    systolic: latestBp?.systolic ?? null,
    diastolic: latestBp?.diastolic ?? null,
    glucose: latestGlucose?.glucose ?? null,
    glucoseContext: latestGlucose?.glucose_context ?? null,
  });

  const weightPoints = [...vitals]
    .filter((item) => item.weight_kg != null)
    .slice(0, 14)
    .reverse()
    .map((item) => ({ label: fmtShort(item.measured_at), value: item.weight_kg as number }));

  const days = new Map<string, { calories: number; count: number }>();
  for (const meal of meals) {
    const entry = days.get(meal.log_date) ?? { calories: 0, count: 0 };
    entry.calories += meal.calories;
    entry.count += 1;
    days.set(meal.log_date, entry);
  }
  const mealDays = [...days.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 8);

  async function saveNote() {
    setActionError(null);
    if (noteBody.trim().length < 3) return;
    setNoteBusy(true);
    try {
      await api(`/api/admin/patients/${patient.id}/notes`, { method: 'POST', body: { body: noteBody.trim() } });
      setNoteBody('');
      reload();
    } catch (reason) {
      setActionError(errorMessage(reason));
    } finally {
      setNoteBusy(false);
    }
  }

  async function activate(kind: 'monthly' | 'quarter') {
    setActionError(null);
    setActivateBusy(kind);
    try {
      await api(`/api/admin/patients/${patient.id}/activate`, { method: 'POST', body: { kind } });
      reload();
    } catch (reason) {
      setActionError(errorMessage(reason));
    } finally {
      setActivateBusy(null);
    }
  }

  async function updateAppointment(appointmentId: string, status: AppointmentStatus, link?: string) {
    setActionError(null);
    setApptBusy(appointmentId);
    try {
      await api(`/api/admin/appointments/${appointmentId}`, {
        method: 'PATCH',
        body: { status, ...(link ? { meeting_link: link } : {}) },
      });
      setMeetingFor(null);
      setMeetingLink('');
      reload();
    } catch (reason) {
      setActionError(errorMessage(reason));
    } finally {
      setApptBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <a href="#/clinic/patients" className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground">
        <ArrowRight className="size-3.5" /> كل المرضى
      </a>

      <header className="card-soft flex flex-wrap items-center gap-4 p-5">
        <Avatar name={patient.name} className="size-14 text-lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{patient.name}</h1>
            {subscription ? <Badge tone="green">اشتراك نشط · {daysLeft(subscription.ends_at)} يوم</Badge> : <Badge tone="amber">بدون اشتراك نشط</Badge>}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            <span dir="ltr">{patient.email}</span>
            {patient.phone && <span dir="ltr">{patient.phone}</span>}
            <span>{patient.gender === 'female' ? 'أنثى' : patient.gender === 'male' ? 'ذكر' : 'النوع غير محدد'}</span>
            <span>{ageFromYear(patient.birth_year)}</span>
            <span>مسجل منذ {fmtDate(patient.created_at)}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {conditions.map((conditionId) => (
              <span key={conditionId} className="rounded-full bg-secondary/70 px-2.5 py-0.5 text-[10px] font-medium text-secondary-foreground">{CONDITION_LABELS[conditionId]}</span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {patient.phone && (
            <>
              <a href={`tel:${patient.phone}`} className="flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted" aria-label="اتصال"><Phone className="size-4" /></a>
              <a href={`https://wa.me/${patient.phone.replace(/^0/, '20')}`} target="_blank" rel="noreferrer" className="flex size-9 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" aria-label="واتساب"><MessageCircle className="size-4" /></a>
            </>
          )}
          <a href={`mailto:${patient.email}`} className="flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted" aria-label="بريد"><Mail className="size-4" /></a>
        </div>
      </header>

      {actionError && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">{actionError}</p>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="مؤشر كتلة الجسم" value={assessment.bmi ?? '—'} hint={latestWeight ? `${latestWeight.weight_kg} كجم · ${fmtShort(latestWeight.measured_at)}` : 'لا يوجد وزن مسجل'} icon={<Scale className="size-5" />} tone={assessment.bmiTone} />
        <StatCard label="محيط الخصر" value={patient.waist_cm ?? '—'} unit={patient.waist_cm ? 'سم' : undefined} hint={assessment.waistLabel} icon={<Ruler className="size-5" />} tone={assessment.waistTone} />
        <StatCard label="محيط الذراع" value={patient.arm_cm ?? '—'} unit={patient.arm_cm ? 'سم' : undefined} hint={assessment.armLabel} icon={<Ruler className="size-5" />} tone={assessment.armTone} />
        <StatCard
          label="آخر ضغط / سكر"
          value={latestBp ? `${latestBp.systolic}/${latestBp.diastolic}` : '—'}
          hint={latestGlucose ? `سكر ${latestGlucose.glucose} · ${glucoseBand(latestGlucose.glucose, latestGlucose.glucose_context).label}` : 'لا توجد قراءات كافية'}
          icon={<HeartPulse className="size-5" />}
          tone={bpBand(latestBp?.systolic ?? null, latestBp?.diastolic ?? null).tone}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
        <SectionCard title="اتجاه الوزن" description="آخر 14 قياسًا">
          {weightPoints.length ? <TrendChart data={weightPoints} unit="كجم" height={200} /> : <EmptyState icon={<Activity className="size-5" />} title="لا توجد قياسات وزن" />}
        </SectionCard>
        <SectionCard title="ملخص التقييم">
          <p className="text-xs leading-6 text-muted-foreground">{assessment.summary}</p>
          <ul className="mt-3 space-y-2">
            {assessment.flags.slice(0, 4).map((flag) => (
              <li key={flag.title} className="rounded-xl border border-border/70 bg-muted/40 px-3 py-2">
                <p className="text-[11px] font-semibold">{flag.title}</p>
                <p className="mt-0.5 text-[11px] leading-5 text-muted-foreground">{flag.text}</p>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between rounded-xl bg-muted/60 px-3 py-2 text-[11px]">
            <span className="flex items-center gap-1.5 text-muted-foreground"><Target className="size-3.5" /> هدف الأخصائي</span>
            <span className="font-semibold">{data.plan?.target_calories ?? patient.target_calories ?? '—'} سعرة</span>
          </div>
        </SectionCard>
      </div>

      <PlanManager detail={data} onChanged={reload} />

      <div className="grid gap-4 lg:grid-cols-2">
        <QuestionsPanel questions={questions} onChanged={reload} />

        <SectionCard title="ملاحظات الأخصائي" description="ملاحظات داخلية مسجلة في ملف المريض.">
          <textarea
            className="input-base min-h-20 resize-y py-2.5 text-sm"
            value={noteBody}
            onChange={(event) => setNoteBody(event.target.value)}
            maxLength={2000}
            placeholder="ملاحظة عن الالتزام، القياسات، أو تعديلات الخطة..."
            aria-label="ملاحظة جديدة"
          />
          <div className="mt-2 flex justify-end">
            <Button type="button" size="sm" onClick={() => void saveNote()} disabled={noteBusy || noteBody.trim().length < 3} className="rounded-full px-4">
              {noteBusy ? <Spinner className="text-primary-foreground" /> : <Plus className="size-3.5" />} إضافة ملاحظة
            </Button>
          </div>
          {notes.length === 0 ? <p className="mt-3 text-xs text-muted-foreground">لا توجد ملاحظات بعد.</p> : (
            <ul className="mt-3 space-y-2">
              {notes.slice(0, 6).map((note) => (
                <li key={note.id} className="rounded-xl bg-muted/50 px-3 py-2">
                  <p className="text-xs leading-6">{note.body}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{fmtDateTime(note.created_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="المواعيد" description={`${appointments.length} موعدًا`}>
          {appointments.length === 0 ? (
            <EmptyState icon={<CalendarClock className="size-5" />} title="لا توجد مواعيد" />
          ) : (
            <ul className="space-y-3">
              {appointments.slice(0, 8).map((appointment) => (
                <li key={appointment.id} className="rounded-2xl border border-border/80 bg-card p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold">{APPOINTMENT_LABELS[appointment.kind]} · {fmtDateTime(appointment.scheduled_at)}</p>
                      {appointment.patient_note && <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{appointment.patient_note}</p>}
                      {appointment.meeting_link && (
                        <a href={appointment.meeting_link} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"><Video className="size-3" /> رابط المتابعة</a>
                      )}
                    </div>
                    <Badge tone={statusTone[appointment.status]}>{STATUS_LABELS[appointment.status]}</Badge>
                  </div>
                  {['requested', 'confirmed'].includes(appointment.status) && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {appointment.status === 'requested' && (
                        <Button type="button" size="xs" onClick={() => { setMeetingFor(appointment.id); setMeetingLink(appointment.meeting_link ?? ''); }} disabled={apptBusy === appointment.id} className="rounded-full">
                          <Video className="size-3" /> تأكيد مع رابط
                        </Button>
                      )}
                      {appointment.status === 'requested' && (
                        <Button type="button" size="xs" variant="outline" onClick={() => void updateAppointment(appointment.id, 'confirmed')} disabled={apptBusy === appointment.id} className="rounded-full">
                          <CheckCircle2 className="size-3" /> تأكيد
                        </Button>
                      )}
                      <Button type="button" size="xs" variant="outline" onClick={() => void updateAppointment(appointment.id, 'completed')} disabled={apptBusy === appointment.id} className="rounded-full">إكمال</Button>
                      <Button type="button" size="xs" variant="ghost" onClick={() => void updateAppointment(appointment.id, 'cancelled')} disabled={apptBusy === appointment.id} className="rounded-full text-red-600 hover:bg-red-50">
                        <XCircle className="size-3" /> إلغاء
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
          <a href="#/clinic/appointments" className="mt-3 inline-flex text-xs font-semibold text-primary hover:underline">إدارة كل المتابعات ←</a>
        </SectionCard>

        <div className="space-y-4">
          <SectionCard title="الاشتراك" description={subscription ? `ينتهي ${fmtDate(subscription.ends_at)}` : latest_subscription ? `آخر اشتراك انتهى ${fmtDate(latest_subscription.ends_at)}` : 'لا يوجد اشتراك بعد'}>
            {subscription ? (
              <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2.5 text-xs text-emerald-900">
                <span className="font-semibold">{PAYMENT_LABELS[subscription.kind]} نشط</span>
                <Badge tone="green">{daysLeft(subscription.ends_at)} يوم</Badge>
              </div>
            ) : (
              <p className="text-xs leading-6 text-muted-foreground">فعّل اشتراكًا يدويًا للمريض بعد استلام الدفع خارج الموقع.</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => void activate('monthly')} disabled={activateBusy !== null} className="rounded-full">
                {activateBusy === 'monthly' ? <Spinner /> : <Wallet className="size-3.5" />} تفعيل شهري
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => void activate('quarter')} disabled={activateBusy !== null} className="rounded-full">
                {activateBusy === 'quarter' ? <Spinner /> : <Wallet className="size-3.5" />} تفعيل 3 شهور
              </Button>
            </div>
          </SectionCard>

          <SectionCard title="سجل الوجبات" description="آخر 8 أيام مسجلة">
            {mealDays.length === 0 ? <p className="text-xs text-muted-foreground">لا توجد وجبات مسجلة خلال آخر 14 يومًا.</p> : (
              <ul className="divide-y divide-border/70">
                {mealDays.map(([date, totals]) => (
                  <li key={date} className="flex items-center justify-between py-2 text-xs first:pt-0 last:pb-0">
                    <span>{fmtDate(date)}</span>
                    <span className="text-muted-foreground">{totals.count} وجبة · <span className="font-semibold text-foreground">{totals.calories} سعرة</span></span>
                  </li>
                ))}
              </ul>
            )}
            {meals.length > 0 && (
              <p className="mt-2 text-[10px] text-muted-foreground">أحدث وجبة: {meals[0].name} ({MEAL_LABELS[meals[0].meal_type]})</p>
            )}
          </SectionCard>
        </div>
      </div>

      <SectionCard title="سجل المدفوعات" description={`${payments.length} عملية`}>
        {payments.length === 0 ? (
          <p className="text-xs text-muted-foreground">لا توجد مدفوعات مسجلة.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-border text-[11px] text-muted-foreground">
                  <th className="pb-2 font-medium">الباقة</th>
                  <th className="pb-2 font-medium">المبلغ</th>
                  <th className="pb-2 font-medium">الطريقة</th>
                  <th className="pb-2 font-medium">المرجع</th>
                  <th className="pb-2 font-medium">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="py-2">{PAYMENT_LABELS[payment.kind]}</td>
                    <td className="py-2 font-semibold">{fmtMoney(payment.amount)}</td>
                    <td className="py-2 text-muted-foreground">{METHOD_LABELS[payment.method] ?? payment.method}</td>
                    <td className="py-2 font-mono text-[10px] text-muted-foreground" dir="ltr">{payment.reference}</td>
                    <td className="py-2 text-muted-foreground">{fmtShort(payment.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <InbodyGallery patientId={patient.id} />

      <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
        <SectionCard title="آخر القياسات" description="الوزن والضغط والسكر">
          {vitals.length === 0 ? <p className="text-xs text-muted-foreground">لا توجد قياسات مسجلة.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-border text-[11px] text-muted-foreground">
                    <th className="pb-2 font-medium">التاريخ</th>
                    <th className="pb-2 font-medium">الوزن</th>
                    <th className="pb-2 font-medium">الضغط</th>
                    <th className="pb-2 font-medium">السكر</th>
                    <th className="pb-2 font-medium">ملاحظة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {vitals.slice(0, 8).map((vital) => (
                    <tr key={vital.id}>
                      <td className="py-2 text-muted-foreground">{fmtShort(vital.measured_at)}</td>
                      <td className="py-2">{vital.weight_kg ?? '—'}</td>
                      <td className="py-2">{vital.systolic != null ? `${vital.systolic}/${vital.diastolic}` : '—'}</td>
                      <td className="py-2">{vital.glucose != null ? `${vital.glucose} ${vital.glucose_context === 'fasting' ? '(صائم)' : ''}` : '—'}</td>
                      <td className="max-w-40 truncate py-2 text-[11px] text-muted-foreground">{vital.note ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        <SectionCard title="التقييم الغذائي" description="محسوب من البيانات المسجلة">
          <ul className="space-y-2 text-[11px] leading-6">
            <li className="flex items-center justify-between rounded-lg bg-muted/50 px-2.5 py-1.5"><span className="text-muted-foreground">الطول</span><span className="font-semibold">{patient.height_cm ?? '—'} سم</span></li>
            <li className="flex items-center justify-between rounded-lg bg-muted/50 px-2.5 py-1.5"><span className="text-muted-foreground">الوزن الصحي لطوله</span><span className="font-semibold">{assessment.healthyLow ?? '—'}–{assessment.healthyHigh ?? '—'} كجم</span></li>
            <li className="flex items-center justify-between rounded-lg bg-muted/50 px-2.5 py-1.5"><span className="text-muted-foreground">الخصر/الطول</span><span className="font-semibold">{assessment.whtr ?? '—'}</span></li>
            <li className="flex items-center justify-between rounded-lg bg-muted/50 px-2.5 py-1.5"><span className="text-muted-foreground">مريض منذ</span><span className="font-semibold">{fmtDate(patient.created_at)}</span></li>
          </ul>
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-border bg-card px-3 py-2 text-[11px] leading-5 text-muted-foreground">
            <ClipboardList className="mt-0.5 size-3.5 shrink-0 text-primary" />
            راجع القياسات والوجبات قبل اعتماد الخطة. الخطة لا تظهر للمريض قبل الاعتماد.
          </div>
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-border bg-card px-3 py-2 text-[11px] leading-5 text-muted-foreground">
            <Droplets className="mt-0.5 size-3.5 shrink-0 text-primary" />
            للاستفسارات: {CONTACT.email} · <span dir="ltr">{CONTACT.phone}</span>
          </div>
        </SectionCard>
      </div>

      <Modal
        open={Boolean(meetingFor)}
        onClose={() => setMeetingFor(null)}
        title="تأكيد الموعد مع رابط المتابعة"
        description="أدخل رابط الاجتماع (Zoom Meet أو أي رابط https). سيظهر للمريض في صفحة المواعيد."
        footer={(
          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setMeetingFor(null)} className="rounded-full">إلغاء</Button>
            <Button
              type="button"
              disabled={apptBusy !== null || !/^https:\/\//.test(meetingLink.trim())}
              onClick={() => meetingFor && void updateAppointment(meetingFor, 'confirmed', meetingLink.trim())}
              className="rounded-full px-5"
            >
              {apptBusy ? <Spinner className="text-primary-foreground" /> : <Save className="size-4" />} تأكيد وإرسال الرابط
            </Button>
          </div>
        )}
      >
        <label htmlFor="meeting-link" className="text-xs font-semibold">رابط المتابعة</label>
        <input
          id="meeting-link"
          dir="ltr"
          className="input-base mt-1.5 text-right font-mono text-xs"
          value={meetingLink}
          onChange={(event) => setMeetingLink(event.target.value)}
          placeholder="https://meet.google.com/..."
        />
        <p className="mt-2 text-[11px] text-muted-foreground">يجب أن يبدأ الرابط بـ https:// — لا تُقبل الروابط غير الآمنة.</p>
      </Modal>
    </div>
  );
}
