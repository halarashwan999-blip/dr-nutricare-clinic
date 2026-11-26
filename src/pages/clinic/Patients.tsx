import { useMemo, useState } from 'react';
import { ArrowLeft, Search, Users } from 'lucide-react';
import { useApi } from '@/hooks';
import { Badge, EmptyState, LoadingBlock } from '@/components/ui-kit';
import { Avatar } from '@/components/ui-kit';
import { CONDITION_LABELS, daysLeft, fmtDate, fmtShort } from '@/utils';
import type { PatientListItem } from '@/types';

export function ClinicPatients() {
  const { data, error, loading } = useApi<PatientListItem[]>('/api/admin/patients');
  const [term, setTerm] = useState('');

  const list = useMemo(() => {
    const all = data ?? [];
    const q = term.trim().toLowerCase();
    if (!q) return all;
    return all.filter((patient) => patient.name.toLowerCase().includes(q)
      || (patient.email ?? '').toLowerCase().includes(q)
      || (patient.phone ?? '').includes(q));
  }, [data, term]);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">المرضى</h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">افتح ملف أي مريض لمراجعة قياساته ووجباته، وإنشاء الخطة الغذائية واعتمادها.</p>
        </div>
        <Badge tone="green">{data ? `${data.length} مريضًا` : 'جارٍ التحميل'}</Badge>
      </header>

      <div className="card-soft p-3">
        <label className="relative block">
          <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="input-base pr-9"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="ابحث بالاسم أو البريد أو رقم الهاتف"
            aria-label="بحث في المرضى"
          />
        </label>
      </div>

      {loading && !data ? <LoadingBlock /> : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : list.length === 0 ? (
        <div className="card-soft">
          <EmptyState icon={<Users className="size-5" />} title={term ? 'لا توجد نتائج مطابقة' : 'لا يوجد مرضى مسجلون بعد'} description={term ? 'جرّب كلمة بحث أخرى.' : 'ستظهر هنا حسابات المرضى فور تسجيلهم.'} />
        </div>
      ) : (
        <div className="card-soft overflow-hidden">
          <ul className="divide-y divide-border/70">
            {list.map((patient) => {
              const conditions = patient.conditions?.length ? patient.conditions : (patient.condition ? [patient.condition] : []);
              return (
                <li key={patient.id}>
                  <a href={`#/clinic/patients/${patient.id}`} className="flex flex-wrap items-center gap-3 px-4 py-4 transition-colors hover:bg-muted/40 sm:px-5">
                    <Avatar name={patient.name} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold">{patient.name}</p>
                        {patient.subscription ? <Badge tone="green">اشتراك {daysLeft(patient.subscription.ends_at)} يوم</Badge> : <Badge tone="amber">بدون اشتراك</Badge>}
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground" dir="ltr">{patient.email}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {conditions.slice(0, 4).map((id) => <span key={id} className="rounded-full bg-secondary/70 px-2 py-0.5 text-[10px] text-secondary-foreground">{CONDITION_LABELS[id]}</span>)}
                      </div>
                    </div>
                    <div className="text-left text-[11px] text-muted-foreground">
                      <p>آخر وزن: <span className="font-semibold text-foreground">{patient.latest_weight ?? '—'} كجم</span></p>
                      <p className="mt-0.5">آخر قياس: {patient.last_vital_at ? fmtShort(patient.last_vital_at) : '—'}</p>
                      <p className="mt-0.5">آخر وجبة: {patient.last_meal_at ? fmtDate(patient.last_meal_at) : '—'}</p>
                    </div>
                    <ArrowLeft className="size-4 shrink-0 text-primary" />
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
