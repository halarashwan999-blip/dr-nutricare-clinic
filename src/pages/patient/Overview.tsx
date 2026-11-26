import {
  Activity, ArrowLeft, CalendarClock, ClipboardList, CreditCard, Flame, HeartPulse,
  Scale, UtensilsCrossed, Video, Droplets, Sparkles,
} from 'lucide-react';
import { useSession } from '@/session';
import { useApi } from '@/hooks';
import { Badge, EmptyState, LoadingBlock, Progress, SectionCard, StatCard } from '@/components/ui-kit';
import { TrendChart } from '@/components/TrendChart';
import {
  bmiBand, bmiOf, bpBand, CONDITION_LABELS, daysLeft, fmtDate, fmtDateTime, fmtShort,
  glucoseBand, greeting, MEAL_LABELS, MEAL_ORDER, sum, todayInput,
} from '@/utils';
import type { Appointment, Meal, Plan, Vital } from '@/types';

interface PlanResponse { plan: Plan; source: 'assigned' | 'template' }

export function PatientOverview() {
  const { user, subscription } = useSession();
  const today = todayInput();
  const meals = useApi<Meal[]>(`/api/meals?date=${today}`);
  const vitals = useApi<Vital[]>('/api/vitals?limit=30');
  const plan = useApi<PlanResponse>('/api/plans/current');
  const appointments = useApi<Appointment[]>('/api/appointments');

  if (!user) return null;

  const target = plan.data?.plan.target_calories ?? user.target_calories ?? 1800;
  const todayMeals = meals.data ?? [];
  const calories = sum(todayMeals.map((meal) => meal.calories));
  const protein = sum(todayMeals.map((meal) => meal.protein));
  const carbs = sum(todayMeals.map((meal) => meal.carbs));
  const fat = sum(todayMeals.map((meal) => meal.fat));

  const readings = vitals.data ?? [];
  const latestWeight = readings.find((item) => item.weight_kg != null);
  const latestBp = readings.find((item) => item.systolic != null && item.diastolic != null);
  const latestGlucose = readings.find((item) => item.glucose != null);
  const bmi = bmiOf(latestWeight?.weight_kg, user.height_cm);
  const bmiInfo = bmiBand(bmi);
  const bpInfo = bpBand(latestBp?.systolic ?? null, latestBp?.diastolic ?? null);
  const glucoseInfo = glucoseBand(latestGlucose?.glucose ?? null, latestGlucose?.glucose_context ?? null);

  const upcoming = (appointments.data ?? [])
    .filter((item) => ['requested', 'confirmed'].includes(item.status))
    .filter((item) => Date.parse(item.scheduled_at) > Date.now() - 3600_000)
    .sort((a, b) => Date.parse(a.scheduled_at) - Date.parse(b.scheduled_at))[0];

  const weightPoints = [...readings]
    .filter((item) => item.weight_kg != null)
    .slice(0, 14)
    .reverse()
    .map((item) => ({ label: fmtShort(item.measured_at), value: item.weight_kg as number }));

  const planMeals = plan.data?.plan.content.meals.slice(0, 3) ?? [];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{fmtDate(new Date())}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{greeting()}، {user.name.split(' ')[0]}</h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            متابعتك الغذائية إلكترونية بالكامل — سجّل يومك وتابع خطتك من هنا.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="green"><Video className="size-3.5" /> متابعة أونلاين</Badge>
          {user.condition && <Badge tone="slate">{CONDITION_LABELS[user.condition]}</Badge>}
        </div>
      </header>

      {!subscription && (
        <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-amber-950 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <CreditCard className="mt-0.5 size-5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">لا يوجد اشتراك متابعة نشط</p>
              <p className="text-xs leading-6 opacity-80">ادفع الاستشارة الأولى أو باقة المتابعة إلكترونيًا من داخل الموقع لتبدأ المتابعة مع الأخصائي.</p>
            </div>
          </div>
          <a href="#/app/billing" className="shrink-0 rounded-full bg-amber-900 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-950">عرض الباقات</a>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="سعرات اليوم"
          value={calories.toLocaleString('en-US')}
          unit={`/ ${target.toLocaleString('en-US')}`}
          hint={`متبقي ${Math.max(0, target - calories).toLocaleString('en-US')} سعرة`}
          icon={<Flame className="size-5" />}
          tone={calories > target ? 'red' : 'green'}
        />
        <StatCard
          label="الوزن الحالي"
          value={latestWeight?.weight_kg ?? '—'}
          unit={latestWeight ? 'كجم' : undefined}
          hint={bmi ? `BMI ${bmi} · ${bmiInfo.label}` : 'أضف الطول والوزن لحساب BMI'}
          icon={<Scale className="size-5" />}
          tone={bmiInfo.tone}
        />
        <StatCard
          label="ضغط الدم"
          value={latestBp ? `${latestBp.systolic}/${latestBp.diastolic}` : '—'}
          unit={latestBp ? 'mmHg' : undefined}
          hint={latestBp ? `${bpInfo.label} · ${fmtShort(latestBp.measured_at)}` : 'لم تُسجل قياسات ضغط بعد'}
          icon={<HeartPulse className="size-5" />}
          tone={bpInfo.tone}
        />
        <StatCard
          label="سكر الدم"
          value={latestGlucose?.glucose ?? '—'}
          unit={latestGlucose ? 'mg/dL' : undefined}
          hint={latestGlucose ? `${glucoseInfo.label} · ${latestGlucose.glucose_context === 'fasting' ? 'صائم' : latestGlucose.glucose_context === 'post_meal' ? 'بعد الأكل' : 'عشوائي'}` : 'لم تُسجل قراءات سكر بعد'}
          icon={<Droplets className="size-5" />}
          tone={glucoseInfo.tone}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <SectionCard
          className="lg:col-span-3"
          title="سجل اليوم"
          description={`${todayMeals.length} وجبة مسجلة اليوم`}
          action={<a href="#/app/meals" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">فتح السجل <ArrowLeft className="size-3.5" /></a>}
        >
          <div className="space-y-4">
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="font-medium text-muted-foreground">التقدم نحو هدف السعرات</span>
                <span className="font-semibold">{Math.round((calories / target) * 100)}%</span>
              </div>
              <Progress value={calories} max={target} tone={calories > target ? 'red' : 'green'} />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: 'بروتين', value: protein },
                { label: 'كربوهيدرات', value: carbs },
                { label: 'دهون', value: fat },
              ].map((macro) => (
                <div key={macro.label} className="rounded-xl bg-muted/70 px-2 py-2.5">
                  <p className="text-base font-bold">{macro.value || 0}<span className="text-[10px] font-normal text-muted-foreground"> جم</span></p>
                  <p className="text-[10px] text-muted-foreground">{macro.label}</p>
                </div>
              ))}
            </div>
            {todayMeals.length === 0 ? (
              <EmptyState
                icon={<UtensilsCrossed className="size-5" />}
                title="لم تسجّل وجبات اليوم"
                description="أضف وجبتك الأولى لتتابع سعراتك مع الأخصائي."
                action={<a href="#/app/meals" className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">إضافة وجبة</a>}
              />
            ) : (
              <ul className="divide-y divide-border/70">
                {MEAL_ORDER.map((type) => {
                  const items = todayMeals.filter((meal) => meal.meal_type === type);
                  if (items.length === 0) return null;
                  return (
                    <li key={type} className="flex items-start justify-between gap-3 py-2.5">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground">{MEAL_LABELS[type]}</p>
                        <p className="mt-0.5 text-sm">{items.map((meal) => meal.name).join('، ')}</p>
                      </div>
                      <span className="shrink-0 text-xs font-semibold">{sum(items.map((meal) => meal.calories))} سعرة</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </SectionCard>

        <SectionCard
          className="lg:col-span-2"
          title="خطتي الغذائية"
          description={plan.data ? (plan.data.source === 'assigned' ? 'خطة مخصصة من الأخصائي' : 'خطة أساسية حسب حالتك') : undefined}
          action={<a href="#/app/plan" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">التفاصيل <ArrowLeft className="size-3.5" /></a>}
        >
          {plan.loading && !plan.data ? <LoadingBlock /> : plan.data ? (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold leading-6">{plan.data.plan.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">هدف {plan.data.plan.target_calories} سعرة يوميًا</p>
                </div>
                <Badge tone={plan.data.source === 'assigned' ? 'green' : 'amber'}>{plan.data.source === 'assigned' ? 'مخصصة' : 'أساسية'}</Badge>
              </div>
              <ul className="space-y-2">
                {planMeals.map((meal) => (
                  <li key={meal.name} className="rounded-xl bg-muted/60 px-3 py-2.5">
                    <p className="text-xs font-semibold">{meal.name}{meal.calories ? <span className="mr-1 font-normal text-muted-foreground">· {meal.calories} سعرة</span> : null}</p>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-muted-foreground">{meal.items.join(' • ')}</p>
                  </li>
                ))}
              </ul>
              {plan.data.source === 'template' && (
                <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-900">
                  <Sparkles className="mt-0.5 size-3.5 shrink-0" /> خطة أساسية — سيقوم الأخصائي بتخصيصها بعد الاستشارة.
                </p>
              )}
            </div>
          ) : (
            <EmptyState icon={<ClipboardList className="size-5" />} title="الخطة قيد التحميل" description={plan.error ?? undefined} />
          )}
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <SectionCard
          className="lg:col-span-3"
          title="اتجاه الوزن"
          description="آخر 14 قياسًا"
          action={<a href="#/app/vitals" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">كل القياسات <ArrowLeft className="size-3.5" /></a>}
        >
          {vitals.loading && !vitals.data ? <LoadingBlock /> : weightPoints.length ? (
            <TrendChart data={weightPoints} unit="كجم" height={210} />
          ) : (
            <EmptyState
              icon={<Activity className="size-5" />}
              title="لا توجد قياسات وزن"
              description="سجّل وزنك دوريًا ليرى الأخصائي تطورك."
              action={<a href="#/app/vitals" className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">إضافة قياس</a>}
            />
          )}
        </SectionCard>

        <div className="space-y-4 lg:col-span-2">
          <SectionCard title="الموعد القادم" action={<a href="#/app/appointments" className="text-xs font-semibold text-primary hover:underline">المواعيد</a>}>
            {upcoming ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <CalendarClock className="size-4 text-primary" />
                  {fmtDateTime(upcoming.scheduled_at)}
                </div>
                <Badge tone={upcoming.status === 'confirmed' ? 'green' : 'amber'}>{upcoming.status === 'confirmed' ? 'مؤكد' : 'بانتظار التأكيد'}</Badge>
                {upcoming.meeting_link && (
                  <a href={upcoming.meeting_link} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">
                    <Video className="size-3.5" /> دخول المتابعة الإلكترونية
                  </a>
                )}
              </div>
            ) : (
              <div className="text-center">
                <p className="text-xs leading-6 text-muted-foreground">لا يوجد موعد قادم.</p>
                <a href="#/app/appointments" className="mt-2 inline-flex rounded-full border border-border px-4 py-1.5 text-xs font-semibold hover:bg-muted">اطلب موعدًا</a>
              </div>
            )}
          </SectionCard>

          <SectionCard title="حالة الاشتراك">
            {subscription ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">اشتراك نشط</p>
                  <Badge tone="green">{daysLeft(subscription.ends_at)} يوم متبقي</Badge>
                </div>
                <p className="text-xs text-muted-foreground">ينتهي في {fmtDate(subscription.ends_at)}</p>
                <a href="#/app/billing" className="text-xs font-semibold text-primary hover:underline">إدارة الاشتراك ←</a>
              </div>
            ) : (
              <div>
                <p className="text-xs leading-6 text-muted-foreground">ابدأ بباقة متابعة لتتابع مع الأخصائي وتُحدّث خطتك شهريًا.</p>
                <a href="#/app/billing" className="mt-2 inline-flex rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground">اختيار باقة</a>
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
