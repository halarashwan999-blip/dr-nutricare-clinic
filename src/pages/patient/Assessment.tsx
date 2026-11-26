import { useEffect, useRef, useState } from 'react';
import {
  Activity, ArrowLeft, CheckCircle2, ClipboardList, Info, MessageCircle, Ruler, Save,
  Scale, Sparkles, Target,
} from 'lucide-react';
import { useSession } from '@/session';
import { useApi } from '@/hooks';
import { api, errorMessage } from '@/api';
import { useCatalog } from '@/catalog';
import { assessHealth } from '@/assessment';
import { MeasurementGuide } from '@/components/measure-guide';
import { InbodyUpload } from '@/components/inbody-upload';
import { Alert, Badge, SectionCard, Spinner } from '@/components/ui-kit';
import { Button } from '@/components/ui/button';
import { CONDITION_LABELS, CHRONIC_CONDITIONS } from '@/utils';
import type { ConditionId, User, Vital } from '@/types';

export function PatientAssessment() {
  const { user, updateUser } = useSession();
  const { catalog } = useCatalog();
  const vitals = useApi<Vital[]>('/api/vitals?limit=30');
  const initialized = useRef(false);

  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [waist, setWaist] = useState('');
  const [arm, setArm] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  const [conditions, setConditions] = useState<ConditionId[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (initialized.current || !user) return;
    const latestWeight = (vitals.data ?? []).find((item) => item.weight_kg != null);
    if (vitals.loading && !vitals.data) return;
    initialized.current = true;
    setWeight(latestWeight?.weight_kg ? String(latestWeight.weight_kg) : '');
    setHeight(user.height_cm ? String(user.height_cm) : '');
    setWaist(user.waist_cm ? String(user.waist_cm) : '');
    setArm(user.arm_cm ? String(user.arm_cm) : '');
    setGender(user.gender ?? '');
    setConditions(user.conditions?.length ? user.conditions : user.condition ? [user.condition] : []);
  }, [user, vitals.data, vitals.loading]);

  if (!user) return null;

  const latestBp = (vitals.data ?? []).find((item) => item.systolic != null && item.diastolic != null);
  const latestGlucose = (vitals.data ?? []).find((item) => item.glucose != null);
  const assessment = assessHealth({
    weight: weight ? Number(weight) : null,
    height: height ? Number(height) : null,
    waist: waist ? Number(waist) : null,
    arm: arm ? Number(arm) : null,
    gender: gender || null,
    conditions,
    systolic: latestBp?.systolic ?? null,
    diastolic: latestBp?.diastolic ?? null,
    glucose: latestGlucose?.glucose ?? null,
    glucoseContext: latestGlucose?.glucose_context ?? null,
  });

  function toggleCondition(id: ConditionId) {
    setConditions((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function save() {
    setError(null);
    if (!weight || !height) {
      setError('أدخل الوزن والطول على الأقل لحساب التقييم.');
      return;
    }
    setBusy(true);
    try {
      const profile = await api<{ user: User }>('/api/profile', {
        method: 'PATCH',
        body: {
          height_cm: Number(height),
          waist_cm: waist ? Number(waist) : null,
          arm_cm: arm ? Number(arm) : null,
          conditions,
          ...(gender ? { gender } : {}),
        },
      });
      updateUser(profile.user);
      const latestWeight = (vitals.data ?? []).find((item) => item.weight_kg != null);
      if (!latestWeight || latestWeight.weight_kg !== Number(weight)) {
        await api<Vital>('/api/vitals', { method: 'POST', body: { weight_kg: Number(weight) } });
        vitals.reload();
      }
      setSaved(true);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Badge tone="green"><Ruler className="size-3.5" /> التقييم الأولي</Badge>
            {saved && <Badge tone="blue"><CheckCircle2 className="size-3.5" /> محفوظ</Badge>}
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">قياساتك وتقييم حالتك</h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            سجّل القياسات والأمراض المزمنة ليعتمد عليها الأخصائي في بناء خطتك، وسيظهر تقييمك فورًا.
          </p>
        </div>
        <a href="#/app/appointments" className="text-xs font-semibold text-primary hover:underline">حجز موعد المتابعة ←</a>
      </header>

      <Alert tone="amber" title="لماذا نطلب هذه القياسات؟">
        الوزن والطول ومحيط الخصر والذراع تساعد في تحديد احتياجك من السعرات ومخاطر الدهون المركزية،
        والأمراض المزمنة تُراعى عند وضع الخطة. التقييم هنا مبدئي وليس تشخيصًا طبيًا.
      </Alert>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
        <div className="space-y-4">
          <SectionCard title="القياسات" description="استخدم شريط قياس مرن، والرسوم أدناه توضح الطريقة الصحيحة.">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" htmlFor="a-weight">الوزن (كجم)</label>
                <input id="a-weight" type="number" inputMode="decimal" min={20} max={350} className="input-base" value={weight} onChange={(event) => setWeight(event.target.value)} placeholder="82" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" htmlFor="a-height">الطول (سم)</label>
                <input id="a-height" type="number" inputMode="numeric" min={110} max={230} className="input-base" value={height} onChange={(event) => setHeight(event.target.value)} placeholder="170" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" htmlFor="a-waist">محيط الخصر (سم)</label>
                <input id="a-waist" type="number" inputMode="decimal" min={40} max={250} className="input-base" value={waist} onChange={(event) => setWaist(event.target.value)} placeholder="96" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" htmlFor="a-arm">محيط الذراع (سم)</label>
                <input id="a-arm" type="number" inputMode="decimal" min={15} max={80} className="input-base" value={arm} onChange={(event) => setArm(event.target.value)} placeholder="30" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs font-semibold">النوع</p>
              <div className="mt-2 flex gap-2">
                {([['female', 'أنثى'], ['male', 'ذكر']] as const).map(([value, label]) => (
                  <button key={value} type="button" onClick={() => setGender(value)}
                    className={`rounded-full border px-4 py-1.5 text-xs font-medium ${gender === value ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:bg-muted'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </SectionCard>

          <SectionCard title="الأمراض المزمنة الشائعة" description="اختر كل ما ينطبق عليك — يمكنك تعديلها لاحقًا.">
            <div className="flex flex-wrap gap-2">
              {(catalog?.conditions ?? CHRONIC_CONDITIONS.map((id) => ({ id, label: CONDITION_LABELS[id] }))).map((item) => {
                const active = conditions.includes(item.id);
                return (
                  <button key={item.id} type="button" onClick={() => toggleCondition(item.id as ConditionId)}
                    aria-pressed={active}
                    className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-medium transition-colors ${active ? 'border-primary bg-secondary text-primary' : 'border-border bg-card text-muted-foreground hover:bg-muted'}`}>
                    {active ? <CheckCircle2 className="size-3.5" /> : <span className="size-3.5 rounded-full border border-current opacity-40" />}
                    {item.label}
                  </button>
                );
              })}
            </div>
          </SectionCard>

          <MeasurementGuide />

          <InbodyUpload />

          {error && <Alert tone="red">{error}</Alert>}
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={() => void save()} disabled={busy} className="rounded-full px-6">
              {busy ? <Spinner className="text-primary-foreground" /> : <Save className="size-4" />} حفظ القياسات وعرض التقييم
            </Button>
            {saved && <a href="#/app/overview" className="text-xs font-semibold text-primary hover:underline">الانتقال إلى لوحتي ←</a>}
          </div>
        </div>

        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className="card-soft overflow-hidden">
            <div className="bg-primary px-5 py-4 text-primary-foreground">
              <p className="flex items-center gap-1.5 text-xs opacity-80"><Sparkles className="size-3.5" /> تقييم الحالة</p>
              <p className="mt-1 text-sm font-semibold leading-6">{assessment.summary}</p>
            </div>
            <div className="grid grid-cols-2 divide-x divide-x-reverse divide-border border-b border-border">
              <div className="p-4 text-center">
                <p className="text-[11px] text-muted-foreground">مؤشر كتلة الجسم</p>
                <p className="mt-1 text-2xl font-bold">{assessment.bmi ?? '—'}</p>
                <Badge tone={assessment.bmiTone}>{assessment.bmiLabel}</Badge>
              </div>
              <div className="p-4 text-center">
                <p className="text-[11px] text-muted-foreground">الوزن الصحي لطولك</p>
                <p className="mt-1 text-lg font-bold">{assessment.healthyLow ?? '—'}–{assessment.healthyHigh ?? '—'}</p>
                <p className="text-[10px] text-muted-foreground">كجم (BMI 18.5–24.9)</p>
              </div>
              <div className="border-t border-border p-4 text-center">
                <p className="text-[11px] text-muted-foreground">محيط الخصر</p>
                <p className="mt-1 text-lg font-bold">{waist ? `${waist} سم` : '—'}</p>
                <Badge tone={assessment.waistTone}>{assessment.waistLabel}</Badge>
              </div>
              <div className="border-t border-border p-4 text-center">
                <p className="text-[11px] text-muted-foreground">نسبة الخصر/الطول</p>
                <p className="mt-1 text-lg font-bold">{assessment.whtr ?? '—'}</p>
                <p className="text-[10px] text-muted-foreground">الأفضل أقل من 0.5</p>
              </div>
            </div>
            <div className="p-4">
              <p className="text-[11px] text-muted-foreground">محيط الذراع: <span className="font-semibold text-foreground">{arm ? `${arm} سم` : '—'}</span></p>
              <div className="mt-1"><Badge tone={assessment.armTone}>{assessment.armLabel}</Badge></div>
            </div>
          </div>

          <SectionCard title="ملاحظات التقييم">
            <ul className="space-y-2.5">
              {assessment.flags.length === 0 && <li className="text-xs text-muted-foreground">أدخل الوزن والطول لعرض الملاحظات.</li>}
              {assessment.flags.map((flag) => (
                <li key={flag.title} className="rounded-xl border border-border/70 bg-muted/40 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold">{flag.title}</p>
                    <Badge tone={flag.tone}>مؤشر</Badge>
                  </div>
                  <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{flag.text}</p>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard title="أهداف مبدئية لخطتك">
            <ul className="space-y-2">
              {assessment.focus.map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs leading-6"><Target className="mt-0.5 size-4 shrink-0 text-primary" /> {item}</li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <a href="#/app/questions" className="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-2 text-xs font-semibold hover:bg-muted"><MessageCircle className="size-3.5" /> اسأل الأخصائي</a>
              <a href="#/app/plan" className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground"><ClipboardList className="size-3.5" /> خطتي</a>
            </div>
          </SectionCard>

          <p className="flex items-start gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-[11px] leading-5 text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0 text-primary" />
            التقييم إرشادي ويعتمد على البيانات المسجلة. القرار العلاجي النهائي للأخصائي وطبيبك المعالج.
          </p>

          <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-xs">
            <span className="flex items-center gap-2 text-muted-foreground"><Scale className="size-4" /> آخر وزن مسجل</span>
            <span className="font-semibold">{(vitals.data ?? []).find((item) => item.weight_kg != null)?.weight_kg ?? '—'} كجم</span>
          </div>
          <a href="#/app/overview" className="flex items-center gap-2 text-xs font-semibold text-primary hover:underline"><Activity className="size-4" /> العودة إلى لوحة المتابعة <ArrowLeft className="size-3.5" /></a>
        </div>
      </div>
    </div>
  );
}
