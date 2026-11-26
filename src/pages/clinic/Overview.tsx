import { useState } from 'react';
import {
  Activity, ArrowLeft, BadgeCheck, CalendarClock, MessageCircle, Send, Users, Wallet, Video,
} from 'lucide-react';
import { useSession } from '@/session';
import { useApi } from '@/hooks';
import { api, errorMessage } from '@/api';
import { Alert, Badge, EmptyState, LoadingBlock, Modal, SectionCard, Spinner, StatCard } from '@/components/ui-kit';
import { Button } from '@/components/ui/button';
import {
  APPOINTMENT_LABELS, CONDITION_LABELS, fmtDateTime, fmtMoney, STATUS_LABELS,
} from '@/utils';
import type {
  AdminSummary, AppointmentWithPatient, QuestionWithPatient,
} from '@/types';

export function ClinicOverview() {
  const { user } = useSession();
  const summary = useApi<AdminSummary>('/api/admin/summary');
  const appointments = useApi<AppointmentWithPatient[]>('/api/admin/appointments?status=requested');
  const questions = useApi<QuestionWithPatient[]>('/api/admin/questions?status=open');

  const [answering, setAnswering] = useState<QuestionWithPatient | null>(null);
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const stats = summary.data;

  async function submitAnswer() {
    if (!answering) return;
    setFormError(null);
    if (answer.trim().length < 2) {
      setFormError('اكتب ردًا واضحًا قبل الإرسال.');
      return;
    }
    setBusy(true);
    try {
      await api(`/api/admin/questions/${answering.id}`, { method: 'PATCH', body: { answer: answer.trim() } });
      setAnswering(null);
      setAnswer('');
      questions.reload();
      summary.reload();
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
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Activity className="size-3.5" /> لوحة أخصائي التغذية العلاجية</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">مرحبًا {user?.name ?? ''}</h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">نظرة سريعة على المرضى والمواعيد والاستفسارات قبل كل متابعة.</p>
        </div>
        <Badge tone="green"><Video className="size-3.5" /> متابعات إلكترونية</Badge>
      </header>

      {summary.error && <Alert tone="red">{summary.error}</Alert>}

      {stats && stats.pending_activations > 0 && (
        <Alert tone="amber" title={`${stats.pending_activations} تحويل بانتظار التأكيد`}>
          راجع تحويلات فودافون كاش وفعّل الحسابات.{' '}
          <a href="#/clinic/activations" className="font-semibold underline underline-offset-4">فتح طلبات التفعيل ←</a>
        </Alert>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="إجمالي المرضى" value={stats ? stats.patients.toLocaleString('en-US') : '—'} icon={<Users className="size-5" />} hint="حسابات المرضى المسجلة" />
        <StatCard label="اشتراكات نشطة" value={stats ? stats.active_subscriptions.toLocaleString('en-US') : '—'} icon={<Activity className="size-5" />} hint="باقات متابعة سارية" tone="blue" />
        <StatCard label="طلبات تفعيل" value={stats ? stats.pending_activations.toLocaleString('en-US') : '—'} icon={<BadgeCheck className="size-5" />} hint={stats?.pending_activations ? 'تحويلات بانتظار التأكيد' : 'لا توجد تحويلات معلقة'} tone={stats?.pending_activations ? 'amber' : 'green'} />
        <StatCard label="استفسارات بانتظار الرد" value={stats ? stats.open_questions.toLocaleString('en-US') : '—'} icon={<MessageCircle className="size-5" />} hint={questions.data ? `${questions.data.length} استفسارًا في القائمة` : undefined} tone={stats?.open_questions ? 'amber' : 'green'} />
        <StatCard label="إيراد الشهر" value={stats ? fmtMoney(stats.month_revenue) : '—'} icon={<Wallet className="size-5" />} hint={stats ? `الإجمالي ${fmtMoney(stats.total_revenue)}` : undefined} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="طلبات مواعيد بانتظار التأكيد"
          description={stats ? `${stats.pending_appointments} طلبًا · ${stats.upcoming_appointments} موعدًا قادمًا` : undefined}
          action={<a href="#/clinic/appointments" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">كل المتابعات <ArrowLeft className="size-3.5" /></a>}
        >
          {appointments.loading && !appointments.data ? <LoadingBlock /> : (appointments.data ?? []).length === 0 ? (
            <EmptyState icon={<CalendarClock className="size-5" />} title="لا توجد طلبات مواعيد جديدة" description="ستظهر هنا طلبات المرضى فور إرسالها." />
          ) : (
            <ul className="divide-y divide-border/70">
              {(appointments.data ?? []).slice(0, 6).map((item) => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-semibold">{item.patient?.name ?? 'مريض'}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {APPOINTMENT_LABELS[item.kind]} · {fmtDateTime(item.scheduled_at)}
                      {item.patient?.condition ? ` · ${CONDITION_LABELS[item.patient.condition]}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone="amber">{STATUS_LABELS[item.status]}</Badge>
                    <a href="#/clinic/appointments" className="text-[11px] font-semibold text-primary hover:underline">إدارة</a>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="استفسارات بانتظار الرد"
          description="ردودك تظهر للمريض في صفحة استفساراته"
          action={<a href="#/clinic/patients" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">المرضى <ArrowLeft className="size-3.5" /></a>}
        >
          {questions.loading && !questions.data ? <LoadingBlock /> : (questions.data ?? []).length === 0 ? (
            <EmptyState icon={<MessageCircle className="size-5" />} title="لا توجد استفسارات مفتوحة" description="كل الاستفسارات تم الرد عليها." />
          ) : (
            <ul className="space-y-3">
              {(questions.data ?? []).slice(0, 4).map((item) => (
                <li key={item.id} className="rounded-2xl border border-border/80 bg-card p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold">{item.patient?.name ?? 'مريض'}</p>
                    <span className="text-[10px] text-muted-foreground">{fmtDateTime(item.created_at)}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-6 text-muted-foreground">{item.body}</p>
                  <button
                    type="button"
                    onClick={() => { setAnswering(item); setAnswer(''); setFormError(null); }}
                    className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                  >
                    <Send className="size-3" /> كتابة الرد
                  </button>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <SectionCard title="ملاحظات المتابعة" bodyClassName="pt-4">
        <p className="text-xs leading-6 text-muted-foreground">
          افتح ملف أي مريض من صفحة المرضى لمراجعة قياساته ووجباته وقياساته، ثم أنشئ مسودة الخطة الغذائية واعتمدها
          ليتم إرسالها إلى حساب المريض. لا تظهر الخطة للمريض إلا بعد الاعتماد.
        </p>
      </SectionCard>

      <Modal
        open={Boolean(answering)}
        onClose={() => setAnswering(null)}
        title={answering ? `رد على ${answering.patient?.name ?? 'المريض'}` : 'رد'}
        description="سيظهر ردك في صفحة استفسارات المريض."
        footer={(
          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setAnswering(null)} className="rounded-full">إلغاء</Button>
            <Button type="button" onClick={() => void submitAnswer()} disabled={busy} className="rounded-full px-6">
              {busy ? <Spinner className="text-primary-foreground" /> : <Send className="size-4" />} إرسال الرد
            </Button>
          </div>
        )}
      >
        {answering && (
          <div className="space-y-3">
            <div className="rounded-xl bg-muted/60 px-3 py-2.5 text-xs leading-6">
              <p className="font-semibold text-muted-foreground">سؤال المريض</p>
              <p className="mt-1 whitespace-pre-line">{answering.body}</p>
            </div>
            <label htmlFor="answer" className="text-xs font-semibold">الرد</label>
            <textarea
              id="answer"
              className="input-base min-h-32 resize-y py-3"
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              maxLength={2000}
              placeholder="اكتب ردًا غذائيًا واضحًا، واحذر تغيير الأدوية أو التشخيص."
            />
            {formError && <Alert tone="red">{formError}</Alert>}
          </div>
        )}
      </Modal>
    </div>
  );
}
