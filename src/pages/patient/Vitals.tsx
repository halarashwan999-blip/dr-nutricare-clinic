import { useState, type FormEvent } from 'react';
import { Activity, Droplets, HeartPulse, Plus, Scale, Trash2 } from 'lucide-react';
import { useSession } from '@/session';
import { useApi } from '@/hooks';
import { api, errorMessage } from '@/api';
import { Alert, Badge, EmptyState, LoadingBlock, SectionCard, Spinner } from '@/components/ui-kit';
import { TrendChart } from '@/components/TrendChart';
import { Button } from '@/components/ui/button';
import {
  bmiBand, bmiOf, bpBand, fmtDateTime, fmtShort, glucoseBand, toLocalDateTimeInput,
} from '@/utils';
import type { Vital } from '@/types';

const CONTEXT_LABELS: Record<string, string> = { fasting: 'صائم', post_meal: 'بعد الأكل', random: 'عشوائي' };

export function PatientVitals() {
  const { user } = useSession();
  const vitals = useApi<Vital[]>('/api/vitals?limit=60');

  const [weight, setWeight] = useState('');
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [glucose, setGlucose] = useState('');
  const [context, setContext] = useState<'fasting' | 'post_meal' | 'random'>('fasting');
  const [note, setNote] = useState('');
  const [measuredAt, setMeasuredAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const readings = vitals.data ?? [];
  const weights = readings.filter((item) => item.weight_kg != null);
  const latestWeight = weights[0];
  const latestBp = readings.find((item) => item.systolic != null && item.diastolic != null);
  const latestGlucose = readings.find((item) => item.glucose != null);
  const bmi = bmiOf(latestWeight?.weight_kg, user?.height_cm);
  const bmiInfo = bmiBand(bmi);
  const bpInfo = bpBand(latestBp?.systolic ?? null, latestBp?.diastolic ?? null);
  const glucoseInfo = glucoseBand(latestGlucose?.glucose ?? null, latestGlucose?.glucose_context ?? null);

  const weightPoints = [...weights].slice(0, 20).reverse().map((item) => ({ label: fmtShort(item.measured_at), value: item.weight_kg as number }));
  const glucosePoints = readings.filter((item) => item.glucose != null).slice(0, 20).reverse().map((item) => ({ label: fmtShort(item.measured_at), value: item.glucose as number }));

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (!weight && !systolic && !glucose) {
      setError('أدخل قياسًا واحدًا على الأقل: الوزن أو الضغط أو السكر.');
      return;
    }
    if ((systolic && !diastolic) || (!systolic && diastolic)) {
      setError('أدخل الضغط الانقباضي والانبساطي معًا.');
      return;
    }
    setBusy(true);
    try {
      await api<Vital>('/api/vitals', {
        method: 'POST',
        body: {
          weight_kg: weight ? Number(weight) : undefined,
          systolic: systolic ? Number(systolic) : undefined,
          diastolic: diastolic ? Number(diastolic) : undefined,
          glucose: glucose ? Number(glucose) : undefined,
          glucose_context: glucose ? context : undefined,
          note: note.trim() ? note.trim() : undefined,
          measured_at: measuredAt ? new Date(measuredAt).toISOString() : undefined,
        },
      });
      setWeight('');
      setSystolic('');
      setDiastolic('');
      setGlucose('');
      setNote('');
      setMeasuredAt('');
      setNotice('تم تسجيل القياس بنجاح.');
      vitals.reload();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm('حذف هذا القياس؟')) return;
    try {
      await api(`/api/vitals/${id}`, { method: 'DELETE' });
      vitals.reload();
    } catch (reason) {
      setError(errorMessage(reason));
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">متابعة الوزن والضغط والسكر</h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">سجّل قراءاتك ليظهر اتجاهها لك وللأخصائي قبل كل متابعة.</p>
        </div>
        <Badge tone="green"><Activity className="size-3.5" /> {readings.length} قياس مسجل</Badge>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card-soft flex items-center justify-between gap-3 p-4">
          <div>
            <p className="text-xs text-muted-foreground">آخر وزن</p>
            <p className="mt-1 text-2xl font-bold">{latestWeight?.weight_kg ?? '—'}<span className="text-xs font-normal text-muted-foreground"> كجم</span></p>
            <div className="mt-1.5 flex items-center gap-1.5"><Badge tone={bmiInfo.tone}>BMI {bmi ?? '—'} · {bmiInfo.label}</Badge></div>
          </div>
          <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Scale className="size-5" /></span>
        </div>
        <div className="card-soft flex items-center justify-between gap-3 p-4">
          <div>
            <p className="text-xs text-muted-foreground">آخر ضغط</p>
            <p className="mt-1 text-2xl font-bold">{latestBp ? `${latestBp.systolic}/${latestBp.diastolic}` : '—'}<span className="text-xs font-normal text-muted-foreground"> mmHg</span></p>
            <div className="mt-1.5"><Badge tone={bpInfo.tone}>{bpInfo.label}</Badge></div>
          </div>
          <span className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><HeartPulse className="size-5" /></span>
        </div>
        <div className="card-soft flex items-center justify-between gap-3 p-4">
          <div>
            <p className="text-xs text-muted-foreground">آخر سكر</p>
            <p className="mt-1 text-2xl font-bold">{latestGlucose?.glucose ?? '—'}<span className="text-xs font-normal text-muted-foreground"> mg/dL</span></p>
            <div className="mt-1.5"><Badge tone={glucoseInfo.tone}>{glucoseInfo.label}{latestGlucose?.glucose_context ? ` · ${CONTEXT_LABELS[latestGlucose.glucose_context]}` : ''}</Badge></div>
          </div>
          <span className="flex size-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><Droplets className="size-5" /></span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="اتجاه الوزن">
          {vitals.loading && !vitals.data ? <LoadingBlock /> : weightPoints.length ? <TrendChart data={weightPoints} height={220} unit="كجم" /> : <EmptyState icon={<Scale className="size-5" />} title="لا توجد قياسات وزن بعد" />}
        </SectionCard>
        <SectionCard title="قراءات السكر">
          {vitals.loading && !vitals.data ? <LoadingBlock /> : glucosePoints.length ? <TrendChart data={glucosePoints} height={220} unit="mg/dL" color="#c98a2b" /> : <EmptyState icon={<Droplets className="size-5" />} title="لا توجد قراءات سكر بعد" />}
        </SectionCard>
      </div>

      <SectionCard title="إضافة قياس" description="يمكنك تسجيل نوع واحد أو أكثر في المرة — الضغط يحتاج القيمتين معًا.">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold" htmlFor="weight">الوزن (كجم)</label>
              <input id="weight" type="number" inputMode="decimal" min={20} max={350} className="input-base" value={weight} onChange={(event) => setWeight(event.target.value)} placeholder="82" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold" htmlFor="systolic">الضغط الانقباضي</label>
              <input id="systolic" type="number" inputMode="numeric" min={60} max={260} className="input-base" value={systolic} onChange={(event) => setSystolic(event.target.value)} placeholder="120" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold" htmlFor="diastolic">الضغط الانبساطي</label>
              <input id="diastolic" type="number" inputMode="numeric" min={30} max={200} className="input-base" value={diastolic} onChange={(event) => setDiastolic(event.target.value)} placeholder="80" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold" htmlFor="glucose">السكر (mg/dL)</label>
              <input id="glucose" type="number" inputMode="numeric" min={20} max={800} className="input-base" value={glucose} onChange={(event) => setGlucose(event.target.value)} placeholder="110" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold" htmlFor="context">وقت قياس السكر</label>
              <select id="context" className="input-base select-base" value={context} onChange={(event) => setContext(event.target.value as typeof context)}>
                <option value="fasting">صائم</option>
                <option value="post_meal">بعد الأكل</option>
                <option value="random">عشوائي</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold" htmlFor="measured_at">وقت القياس (اختياري)</label>
              <input id="measured_at" type="datetime-local" className="input-base" value={measuredAt} max={toLocalDateTimeInput(new Date())} onChange={(event) => setMeasuredAt(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold" htmlFor="note">ملاحظة (اختياري)</label>
              <input id="note" className="input-base" value={note} onChange={(event) => setNote(event.target.value)} maxLength={300} placeholder="مثال: بعد صعود السلم" />
            </div>
          </div>

          {error && <Alert tone="red">{error}</Alert>}
          {notice && <Alert tone="green">{notice}</Alert>}

          <div className="flex justify-end">
            <Button type="submit" className="rounded-full px-6" disabled={busy}>
              {busy ? <Spinner className="text-primary-foreground" /> : <Plus className="size-4" />} تسجيل القياس
            </Button>
          </div>
        </form>
      </SectionCard>

      <SectionCard title="سجل القياسات" description="آخر 60 قياسًا">
        {vitals.error && <Alert tone="red">{vitals.error}</Alert>}
        {vitals.loading && !vitals.data ? <LoadingBlock /> : readings.length === 0 ? (
          <EmptyState icon={<Activity className="size-5" />} title="لم تسجّل أي قياس بعد" description="ابدأ بقياس الوزن أو الضغط أو السكر." />
        ) : (
          <div className="-mx-1 overflow-x-auto">
            <table className="table-clean w-full min-w-[560px] text-sm">
              <thead>
                <tr>
                  <th>التاريخ</th>
                  <th>الوزن</th>
                  <th>الضغط</th>
                  <th>السكر</th>
                  <th>ملاحظة</th>
                  <th aria-label="إجراءات" />
                </tr>
              </thead>
              <tbody>
                {readings.map((item) => (
                  <tr key={item.id}>
                    <td className="whitespace-nowrap text-xs text-muted-foreground">{fmtDateTime(item.measured_at)}</td>
                    <td>{item.weight_kg != null ? `${item.weight_kg} كجم` : '—'}</td>
                    <td>
                      {item.systolic != null ? (
                        <span className="inline-flex items-center gap-1.5">
                          {item.systolic}/{item.diastolic}
                          <Badge tone={bpBand(item.systolic, item.diastolic).tone}>{bpBand(item.systolic, item.diastolic).label}</Badge>
                        </span>
                      ) : '—'}
                    </td>
                    <td>
                      {item.glucose != null ? (
                        <span className="inline-flex items-center gap-1.5">
                          {item.glucose}
                          <Badge tone={glucoseBand(item.glucose, item.glucose_context).tone}>{glucoseBand(item.glucose, item.glucose_context).label}</Badge>
                        </span>
                      ) : '—'}
                    </td>
                    <td className="max-w-[180px] truncate text-xs text-muted-foreground">{item.note ?? '—'}</td>
                    <td className="text-left">
                      <button type="button" onClick={() => void remove(item.id)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600" aria-label="حذف القياس">
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
