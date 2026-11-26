import { useEffect, useRef, useState } from 'react';
import { BadgeCheck, ClipboardList, FileClock, Plus, Send, Sparkles } from 'lucide-react';
import { api, errorMessage } from '@/api';
import { useCatalog } from '@/catalog';
import { Alert, Badge, EmptyState, SectionCard, Spinner } from '@/components/ui-kit';
import { Button } from '@/components/ui/button';
import { CONDITION_LABELS, fmtDate, fmtDateTime } from '@/utils';
import type { PatientDetail, Plan } from '@/types';

export function PlanManager({ detail, onChanged }: { detail: PatientDetail; onChanged: () => void }) {
  const { catalog } = useCatalog();
  const patient = detail.patient;
  const conditions = patient.conditions?.length ? patient.conditions : (patient.condition ? [patient.condition] : []);
  const template = catalog?.plans?.find((item) => item.condition === (patient.condition ?? 'obesity'));

  const [title, setTitle] = useState('');
  const [calories, setCalories] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current || !patient) return;
    initialized.current = true;
    const current = detail.plan;
    setTitle(current?.title ?? (template ? `${template.title} — ${patient.name.split(' ')[0]}` : `${patient.name} — خطة تغذية علاجية`));
    setCalories(String(current?.target_calories ?? patient.target_calories ?? template?.target_calories ?? 1800));
    setNotes('');
  }, [detail.plan, patient, template]);

  const history = detail.plan_history ?? [];
  const current = detail.plan;

  async function createDraft() {
    setError(null);
    setNotice(null);
    if (title.trim().length < 3) {
      setError('اكتب عنوانًا واضحًا للخطة.');
      return;
    }
    const target = Number(calories);
    if (!Number.isFinite(target) || target < 800 || target > 5000) {
      setError('هدف السعرات يجب أن يكون بين 800 و5000 سعرة.');
      return;
    }
    setBusy(true);
    try {
      const result = await api<{ message?: string }>(`/api/admin/patients/${patient.id}/plan`, {
        method: 'POST',
        body: { title: title.trim(), target_calories: target, ...(notes.trim() ? { notes: notes.trim() } : {}) },
      });
      setNotice(result.message ?? 'تم حفظ المسودة.');
      setNotes('');
      onChanged();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  async function publish(plan: Plan) {
    setError(null);
    setNotice(null);
    setPublishing(plan.id);
    try {
      const result = await api<{ message?: string }>(`/api/admin/patients/${patient.id}/plans/${plan.id}/publish`, { method: 'POST' });
      setNotice(result.message ?? 'تم اعتماد الخطة وإرسالها للمريض.');
      onChanged();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setPublishing(null);
    }
  }

  return (
    <div className="space-y-4">
      <SectionCard
        title="الخطة الغذائية"
        description="تُحفظ الخطة كمسودة أولًا، ولا تظهر للمريض حتى تعتمدها."
        action={current ? <Badge tone={current.status === 'published' ? 'green' : 'amber'}>{current.status === 'published' ? 'معتمدة ومرسلة' : 'مسودة قيد المراجعة'}</Badge> : undefined}
      >
        {error && <div className="mb-3"><Alert tone="red">{error}</Alert></div>}
        {notice && <div className="mb-3"><Alert tone="green">{notice}</Alert></div>}

        {current ? (
          <div className="rounded-2xl border border-border/80 bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{current.title}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {CONDITION_LABELS[current.condition]} · هدف {current.target_calories} سعرة يوميًا · {current.content.meals.length} وجبات
                  {current.created_at ? ` · أُنشئت ${fmtDate(current.created_at)}` : ''}
                </p>
              </div>
              <Badge tone={current.status === 'published' ? 'green' : 'amber'}>{current.status === 'published' ? 'مرسلة للمريض' : 'لم تُرسل بعد'}</Badge>
            </div>
            {current.notes && <p className="mt-2 rounded-xl bg-amber-50/70 px-3 py-2 text-[11px] leading-5 text-amber-950">ملاحظات: {current.notes}</p>}
            <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
              {current.content.meals.slice(0, 4).map((meal, index) => (
                <li key={`${meal.name}-${index}`} className="rounded-lg bg-muted/60 px-2.5 py-1.5 text-[11px]">
                  <span className="font-semibold">{meal.name}</span>
                  {meal.calories ? <span className="text-muted-foreground"> · {meal.calories} سعرة</span> : null}
                </li>
              ))}
            </ul>
            {current.status !== 'published' && (
              <div className="mt-3 flex justify-end">
                <Button type="button" onClick={() => void publish(current)} disabled={publishing === current.id} className="rounded-full px-5">
                  {publishing === current.id ? <Spinner className="text-primary-foreground" /> : <Send className="size-4" />} اعتماد وإرسال للمريض
                </Button>
              </div>
            )}
          </div>
        ) : (
          <EmptyState icon={<ClipboardList className="size-5" />} title="لا توجد خطة مخصصة بعد" description="أنشئ مسودة خطة من النموذج أدناه؛ سيتولد محتواها من حالة المريض وأمراضه المصاحبة." />
        )}
      </SectionCard>

      <SectionCard
        title="إنشاء مسودة خطة جديدة"
        description="يعتمد المحتوى تلقائيًا على الحالة الأساسية والأمراض المصاحبة (سمنة + ضغط/سكر/غدة...). راجعها ثم اعتمدها."
        action={<Badge tone="blue"><Sparkles className="size-3.5" /> مبنية على الحالة</Badge>}
      >
        <div className="grid gap-3 sm:grid-cols-[1.6fr_.7fr]">
          <div className="space-y-1.5">
            <label htmlFor="plan-title" className="text-xs font-semibold">عنوان الخطة</label>
            <input id="plan-title" className="input-base" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} placeholder="خطة تغذية علاجية لخسارة الوزن" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="plan-calories" className="text-xs font-semibold">هدف السعرات</label>
            <input id="plan-calories" type="number" inputMode="numeric" min={800} max={5000} className="input-base" value={calories} onChange={(event) => setCalories(event.target.value)} />
          </div>
        </div>
        <div className="mt-3 space-y-1.5">
          <label htmlFor="plan-notes" className="text-xs font-semibold">ملاحظات للمريض (اختياري)</label>
          <textarea id="plan-notes" className="input-base min-h-24 resize-y py-2.5 text-sm" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={2000} placeholder="تعديلات خاصة: حساسية غذائية، أدوية، مواعيد وجبات..." />
        </div>
        <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
          الحالات المراعية: {conditions.length ? conditions.map((id) => CONDITION_LABELS[id]).join('، ') : 'لم تُسجل أمراض مصاحبة'}.
        </p>
        <div className="mt-3 flex justify-end">
          <Button type="button" onClick={() => void createDraft()} disabled={busy} className="rounded-full px-5">
            {busy ? <Spinner className="text-primary-foreground" /> : <Plus className="size-4" />} حفظ المسودة
          </Button>
        </div>
      </SectionCard>

      <SectionCard title="سجل الخطط" description={`${history.length} خطة محفوظة لهذا المريض`}>
        {history.length === 0 ? (
          <p className="text-xs text-muted-foreground">لا يوجد سجل خطط بعد.</p>
        ) : (
          <ul className="divide-y divide-border/70">
            {history.map((plan) => (
              <li key={plan.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0">
                <div>
                  <p className="text-sm font-semibold">{plan.title}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <FileClock className="size-3" /> {plan.created_at ? fmtDateTime(plan.created_at) : '—'}
                    {plan.published_at ? ` · اعتُمدت ${fmtDate(plan.published_at)}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={plan.status === 'published' ? 'green' : 'amber'}>{plan.status === 'published' ? 'معتمدة' : 'مسودة'}</Badge>
                  {plan.status !== 'published' && (
                    <Button type="button" size="sm" variant="outline" onClick={() => void publish(plan)} disabled={publishing === plan.id} className="rounded-full">
                      {publishing === plan.id ? <Spinner /> : <BadgeCheck className="size-3.5" />} اعتماد
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
