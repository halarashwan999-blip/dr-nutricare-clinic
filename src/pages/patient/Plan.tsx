import { ArrowLeft, BadgeCheck, CalendarClock, CheckCircle2, ClipboardList, Printer, Target, XCircle } from 'lucide-react';
import { useSession } from '@/session';
import { useApi } from '@/hooks';
import { Alert, Badge, EmptyState, LoadingBlock, SectionCard } from '@/components/ui-kit';
import { Button } from '@/components/ui/button';
import { CONDITION_LABELS, fmtDate } from '@/utils';
import type { Plan } from '@/types';

interface PlanResponse {
  plan: Plan;
  source: 'assigned' | 'template';
  reviewed: boolean;
  awaiting_review?: boolean;
}

export function PatientPlan() {
  const { user } = useSession();
  const { data, error, loading } = useApi<PlanResponse>('/api/plans/current');

  if (!user) return null;

  return (
    <div className="space-y-5 print-plan">
      <header className="flex flex-wrap items-end justify-between gap-3 print-hide">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">خطتي الغذائية</h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">خطة مبنية على حالتك، يعتمدها الأخصائي قبل إرسالها لك وتُحدّث أثناء المتابعة.</p>
        </div>
        <div className="flex items-center gap-2">
          {user.condition && <Badge tone="slate">{CONDITION_LABELS[user.condition]}</Badge>}
          {data?.reviewed && (
            <Button type="button" onClick={() => window.print()} size="sm" variant="outline" className="rounded-full">
              <Printer className="size-3.5" /> طباعة الخطة
            </Button>
          )}
        </div>
      </header>

      {error && <Alert tone="red">{error}</Alert>}
      {loading && !data ? <LoadingBlock label="جارٍ تحميل خطتك…" /> : !data ? null : (
        <>
          {!data.reviewed && (
            <Alert tone="amber" title={data.awaiting_review ? 'خطتك الجديدة قيد مراجعة الأخصائي' : 'خطة أساسية لحالتك'}>
              {data.awaiting_review
                ? 'أعدّ الأخصائي مسودة خطتك ولم يعتمدها بعد. ستظهر الخطة الكاملة القابلة للطباعة هنا فور اعتمادها.'
                : 'هذه خطة إرشادية أولية تناسب حالتك، وسيعدّلها الأخصائي وفق تحاليلك وقياساتك وأدويةك ثم يرسلها لك بعد المراجعة.'}
              <a href="#/app/appointments" className="mx-1 font-semibold underline">اطلب موعد متابعة</a>.
            </Alert>
          )}
          {data.reviewed && (
            <div className="hidden items-center justify-between border-b-2 border-primary pb-3 print:flex">
              <div>
                <p className="font-bold"><span dir="ltr">Dr. NutriCare Clinic</span> — عيادة تغذية علاجية أونلاين</p>
                <p className="text-xs">خطة غذائية معتمدة للمريض: {user.name}</p>
              </div>
              <p className="text-xs">تاريخ الاعتماد: {fmtDate(data.plan.published_at ?? data.plan.created_at)}</p>
            </div>
          )}

          <div className="card-soft overflow-hidden">
            <div className="flex flex-col gap-4 bg-primary px-5 py-5 text-primary-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div>
                <p className="text-[11px] opacity-75">
                  {data.reviewed ? 'خطة معتمدة من أخصائي التغذية' : data.awaiting_review ? 'نسخة قيد المراجعة' : 'خطة أساسية حسب الحالة'}
                </p>
                <h2 className="mt-1 text-xl font-bold sm:text-2xl">{data.plan.title}</h2>
                {data.plan.created_at && <p className="mt-1 text-[11px] opacity-75">آخر تحديث: {fmtDate(data.plan.created_at)}</p>}
              </div>
              <div className="flex gap-2">
                <div className="rounded-xl bg-white/10 px-4 py-2.5 text-center">
                  <p className="text-lg font-bold">{data.plan.target_calories}</p>
                  <p className="text-[10px] opacity-80">سعرة يوميًا</p>
                </div>
                <div className="rounded-xl bg-white/10 px-4 py-2.5 text-center">
                  <p className="text-lg font-bold">{data.plan.content.meals.length}</p>
                  <p className="text-[10px] opacity-80">وجبات مقترحة</p>
                </div>
              </div>
            </div>
            {data.plan.notes && (
              <div className="border-t border-border bg-amber-50/60 px-5 py-3.5 text-xs leading-6 text-amber-950 sm:px-6">
                <p className="font-semibold">ملاحظات الأخصائي</p>
                <p className="mt-1 whitespace-pre-line">{data.plan.notes}</p>
              </div>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <SectionCard title="وجبات الخطة" description="وزّع الوجبات على يومك حسب أوقاتك، مع الالتزام بالمقادير.">
                {data.plan.content.meals.length === 0 ? (
                  <EmptyState icon={<ClipboardList className="size-5" />} title="لا توجد وجبات في الخطة" description="سيضيف الأخصائي وجبات خطتك بعد المتابعة." />
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {data.plan.content.meals.map((meal, index) => (
                      <article key={`${meal.name}-${index}`} className="rounded-2xl border border-border/80 bg-card p-4">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold">{meal.name}</h3>
                          {meal.calories != null && <Badge tone="green">{meal.calories} سعرة</Badge>}
                        </div>
                        <ul className="mt-2 space-y-1.5">
                          {meal.items.map((item) => (
                            <li key={item} className="flex items-start gap-2 text-xs leading-6 text-muted-foreground">
                              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/60" /> {item}
                            </li>
                          ))}
                        </ul>
                      </article>
                    ))}
                  </div>
                )}
              </SectionCard>

              <div className="grid gap-4 sm:grid-cols-2">
                <SectionCard title="إرشادات عامة">
                  {data.plan.content.guidelines.length === 0 ? <p className="text-xs text-muted-foreground">لا توجد إرشادات إضافية.</p> : (
                    <ul className="space-y-2.5">
                      {data.plan.content.guidelines.map((line) => (
                        <li key={line} className="flex items-start gap-2 text-xs leading-6">
                          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /> {line}
                        </li>
                      ))}
                    </ul>
                  )}
                </SectionCard>
                <SectionCard title="تجنّب قدر الإمكان">
                  {data.plan.content.avoid.length === 0 ? <p className="text-xs text-muted-foreground">لا توجد قائمة تجنب.</p> : (
                    <ul className="space-y-2.5">
                      {data.plan.content.avoid.map((line) => (
                        <li key={line} className="flex items-start gap-2 text-xs leading-6">
                          <XCircle className="mt-0.5 size-4 shrink-0 text-red-500" /> {line}
                        </li>
                      ))}
                    </ul>
                  )}
                </SectionCard>
              </div>
            </div>

            <div className="space-y-4">
              <SectionCard title="كيف تستخدم خطتك">
                <ol className="space-y-3 text-xs leading-6 text-muted-foreground">
                  <li className="flex gap-2"><span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-primary">1</span> سجّل وجباتك اليومية في سجل الطعام.</li>
                  <li className="flex gap-2"><span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-primary">2</span> راقب مجموع السعرات مقارنة بهدف الخطة.</li>
                  <li className="flex gap-2"><span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-primary">3</span> حدّث الوزن والضغط والسكر بانتظام.</li>
                  <li className="flex gap-2"><span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-primary">4</span> احضر المتابعة الإلكترونية لمناقشة النتائج.</li>
                </ol>
              </SectionCard>

              <div className="card-soft space-y-3 p-5 print-hide">
                <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-primary"><Target className="size-5" /></span>
                <p className="font-semibold">تريد تعديل الخطة؟</p>
                <p className="text-xs leading-6 text-muted-foreground">لا تغيّر الخطة أو الأدوية من نفسك. اطلب متابعة أو استفسارًا ليراجع الأخصائي تقدمك.</p>
                <div className="flex flex-wrap gap-2">
                  <a href="#/app/appointments" className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
                    <CalendarClock className="size-3.5" /> طلب متابعة
                  </a>
                  <a href="#/app/questions" className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-semibold hover:bg-muted">إرسال استفسار</a>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-2xl border border-border bg-muted/50 px-4 py-3 text-[11px] leading-5 text-muted-foreground print-hide">
                <BadgeCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                الخطة إرشادية ولا تُغني عن الطبيب المعالج. التزم بالأدوية والفحوصات الدورية حسب توجيهات طبيبك.
              </div>

              <a href="#/app/billing" className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-xs font-semibold hover:bg-muted/50 print-hide">
                اشتراك المتابعة والدفع <ArrowLeft className="size-4 text-primary" />
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
