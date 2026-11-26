import { useState, type FormEvent } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Plus, Trash2, UtensilsCrossed } from 'lucide-react';
import { useSession } from '@/session';
import { useApi } from '@/hooks';
import { api, errorMessage } from '@/api';
import { Alert, Badge, LoadingBlock, Progress, SectionCard, Spinner } from '@/components/ui-kit';
import { TrendChart } from '@/components/TrendChart';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  fmtDate, fmtShort, MEAL_LABELS, MEAL_ORDER, MEAL_SHARES, MEAL_TIMES, mealSlotForNow, shiftDate, sum, todayInput,
} from '@/utils';
import type { Meal, MealType } from '@/types';

export function PatientMeals() {
  const { user, subscription } = useSession();
  const [date, setDate] = useState(todayInput());
  const daily = useApi<Meal[]>(`/api/meals?date=${date}`);
  const weekly = useApi<Meal[]>(`/api/meals?from=${shiftDate(date, -6)}&to=${date}`);

  const [mealType, setMealType] = useState<MealType>(mealSlotForNow);
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const target = user?.target_calories ?? 1800;
  const meals = daily.data ?? [];
  const total = sum(meals.map((meal) => meal.calories));
  const goalTone = total > target ? 'red' : 'green';

  const weekDays = Array.from({ length: 7 }, (_, index) => shiftDate(date, index - 6));
  const weeklyPoints = weekDays.map((day) => ({
    label: fmtShort(`${day}T00:00:00`),
    value: (weekly.data ?? []).filter((meal) => meal.log_date === day).reduce((acc, meal) => acc + meal.calories, 0),
  }));

  function slotCalories(type: MealType) {
    return sum(meals.filter((meal) => meal.meal_type === type).map((meal) => meal.calories));
  }

  function selectSlot(type: MealType) {
    setMealType(type);
    document.getElementById('meal-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await api<Meal>('/api/meals', {
        method: 'POST',
        body: {
          log_date: date,
          meal_type: mealType,
          name,
          calories: Number(calories),
          protein: protein === '' ? undefined : Number(protein),
          carbs: carbs === '' ? undefined : Number(carbs),
          fat: fat === '' ? undefined : Number(fat),
        },
      });
      setName('');
      setCalories('');
      setProtein('');
      setCarbs('');
      setFat('');
      setNotice(`تمت إضافة ${MEAL_LABELS[mealType]} إلى سجل اليوم.`);
      daily.reload();
      weekly.reload();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm('حذف هذه الوجبة من السجل؟')) return;
    try {
      await api(`/api/meals/${id}`, { method: 'DELETE' });
      daily.reload();
      weekly.reload();
    } catch (reason) {
      setError(errorMessage(reason));
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">سجل الطعام والسعرات</h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">٣ وجبات رئيسة + ٢ سناك — سجّل كل موعد ليتابع الأخصائي التزامك.</p>
        </div>
        <Badge tone="green"><UtensilsCrossed className="size-3.5" /> هدفك {target} سعرة</Badge>
      </header>

      <SectionCard bodyClassName="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="icon" className="rounded-full" onClick={() => setDate((value) => shiftDate(value, 1))} aria-label="اليوم التالي">
              <ChevronRight className="size-4" />
            </Button>
            <label className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm">
              <CalendarDays className="size-4 text-muted-foreground" />
              <input type="date" value={date} max={todayInput()} onChange={(event) => setDate(event.target.value)} className="bg-transparent outline-none" aria-label="اختر اليوم" />
            </label>
            <Button type="button" variant="outline" size="icon" className="rounded-full" onClick={() => setDate((value) => shiftDate(value, -1))} aria-label="اليوم السابق">
              <ChevronLeft className="size-4" />
            </Button>
            {date !== todayInput() && (
              <Button type="button" variant="ghost" size="sm" className="rounded-full text-xs" onClick={() => setDate(todayInput())}>اليوم</Button>
            )}
          </div>
          <p className="text-sm font-semibold">{fmtDate(`${date}T00:00:00`)}</p>
        </div>
      </SectionCard>

      <SectionCard
        title="مواعيد الوجبات"
        description="الفاصل بين كل موعد والآخر نحو ٣ ساعات — اختر الموعد لتسجيل وجبته."
      >
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {MEAL_ORDER.map((type) => {
            const logged = meals.filter((meal) => meal.meal_type === type);
            const active = mealType === type;
            return (
              <li key={type}>
                <button
                  type="button"
                  onClick={() => selectSlot(type)}
                  className={cn(
                    'h-full w-full rounded-xl border px-3 py-3 text-right transition-colors',
                    active ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/40',
                  )}
                >
                  <span className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Clock3 className="size-3" /> {MEAL_TIMES[type]}</span>
                    <span className={cn('font-semibold', logged.length ? 'text-foreground' : '')}>
                      {logged.length ? `${sum(logged.map((meal) => meal.calories))} سعرة` : 'لم تُسجل'}
                    </span>
                  </span>
                  <span className="mt-1.5 block text-sm font-semibold">{MEAL_LABELS[type]}</span>
                  <span className="text-[10px] text-muted-foreground">موصى به ~{Math.round(target * MEAL_SHARES[type])} سعرة</span>
                </button>
              </li>
            );
          })}
        </ol>
        <p className="mt-3 text-[11px] text-muted-foreground">الإفطار 8:00 ص · سناك 11:00 ص · الغداء 2:00 م · سناك 5:00 م · العشاء 8:00 م — يمكنك تعديل الأوقات بما يناسب يومك مع الحفاظ على الفاصل.</p>
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard className="lg:col-span-2" title="وجبات اليوم" description={daily.loading ? 'جارٍ التحميل…' : `${meals.length} وجبة مسجلة · ${total} سعرة`}>
          {daily.error && <Alert tone="red">{daily.error}</Alert>}
          {daily.loading && !daily.data ? <LoadingBlock /> : (
            <div className="space-y-3">
              {MEAL_ORDER.map((type) => {
                const items = meals.filter((meal) => meal.meal_type === type);
                const recommended = Math.round(target * MEAL_SHARES[type]);
                return (
                  <div key={type} className={cn('rounded-xl border p-3', items.length ? 'border-border/70 bg-card' : 'border-dashed border-border bg-muted/30')}>
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h3 className="flex items-center gap-1.5 text-sm font-bold">
                          {MEAL_LABELS[type]}
                          <span className="text-[10px] font-medium text-muted-foreground">{MEAL_TIMES[type]}</span>
                        </h3>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">موصى به ~{recommended} سعرة</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {items.length > 0 && <span className="text-[11px] font-semibold">{sum(items.map((item) => item.calories))} سعرة</span>}
                        <button
                          type="button"
                          onClick={() => selectSlot(type)}
                          className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold text-primary hover:border-primary/40"
                        >
                          <Plus className="size-3" /> إضافة
                        </button>
                      </div>
                    </div>
                    {items.length === 0 ? (
                      <p className="mt-2 text-xs text-muted-foreground">لم تسجّل هذه الوجبة بعد.</p>
                    ) : (
                      <ul className="mt-2 space-y-2">
                        {items.map((meal) => (
                          <li key={meal.id} className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-background px-3 py-2.5">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{meal.name}</p>
                              <p className="mt-0.5 text-[11px] text-muted-foreground">
                                {meal.calories} سعرة
                                {meal.protein ? ` · بروتين ${meal.protein} جم` : ''}
                                {meal.carbs ? ` · كارب ${meal.carbs} جم` : ''}
                                {meal.fat ? ` · دهون ${meal.fat} جم` : ''}
                              </p>
                            </div>
                            <button type="button" onClick={() => void remove(meal.id)} className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600" aria-label={`حذف ${meal.name}`}>
                              <Trash2 className="size-4" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        <div className="space-y-4">
          <SectionCard title="ملخص اليوم">
            <div className="space-y-3">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold">{total}</p>
                  <p className="text-xs text-muted-foreground">من أصل {target} سعرة</p>
                </div>
                <Badge tone={goalTone}>{total > target ? `تجاوز ${total - target}` : `متبقي ${target - total}`}</Badge>
              </div>
              <Progress value={total} max={target} tone={goalTone === 'red' ? 'red' : 'green'} />
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: 'بروتين', value: sum(meals.map((meal) => meal.protein)) },
                  { label: 'كربوهيدرات', value: sum(meals.map((meal) => meal.carbs)) },
                  { label: 'دهون', value: sum(meals.map((meal) => meal.fat)) },
                ].map((macro) => (
                  <div key={macro.label} className="rounded-lg bg-muted/70 py-2">
                    <p className="text-sm font-bold">{macro.value}<span className="text-[10px] font-normal"> جم</span></p>
                    <p className="text-[10px] text-muted-foreground">{macro.label}</p>
                  </div>
                ))}
              </div>
              {subscription && <p className="text-[11px] text-muted-foreground">سجلاتك متاحة للأخصائي قبل كل متابعة.</p>}
            </div>
          </SectionCard>

          <SectionCard title="سعرات آخر 7 أيام">
            {weekly.loading && !weekly.data ? <LoadingBlock /> : <TrendChart data={weeklyPoints} height={170} unit="سعرة" />}
          </SectionCard>
        </div>
      </div>

      <div id="meal-form" className="scroll-mt-24">
      <SectionCard
        title="إضافة وجبة"
        description={`أنت تسجّل الآن: ${MEAL_LABELS[mealType]} (${MEAL_TIMES[mealType]}) — املأ الحقول الأساسية، والقيم الغذائية الدقيقة اختيارية.`}
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold" htmlFor="meal_type">الموعد</label>
              <select id="meal_type" className="input-base select-base" value={mealType} onChange={(event) => setMealType(event.target.value as MealType)}>
                {MEAL_ORDER.map((type) => <option key={type} value={type}>{MEAL_LABELS[type]} · {MEAL_TIMES[type]}</option>)}
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold" htmlFor="meal_name">اسم الوجبة</label>
              <input id="meal_name" className="input-base" value={name} onChange={(event) => setName(event.target.value)} required maxLength={100} placeholder="مثال: شوفان بالحليب والمكسرات" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold" htmlFor="calories">السعرات *</label>
              <input id="calories" type="number" inputMode="numeric" min={0} max={5000} className="input-base" value={calories} onChange={(event) => setCalories(event.target.value)} required placeholder="350" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'protein', label: 'بروتين (جم)', value: protein, set: setProtein, placeholder: '20' },
              { id: 'carbs', label: 'كارب (جم)', value: carbs, set: setCarbs, placeholder: '45' },
              { id: 'fat', label: 'دهون (جم)', value: fat, set: setFat, placeholder: '12' },
            ].map((field) => (
              <div key={field.id} className="space-y-1.5">
                <label className="text-xs font-semibold" htmlFor={field.id}>{field.label}</label>
                <input id={field.id} type="number" inputMode="numeric" min={0} max={500} className="input-base" value={field.value} onChange={(event) => field.set(event.target.value)} placeholder={field.placeholder} />
              </div>
            ))}
          </div>

          {error && <Alert tone="red">{error}</Alert>}
          {notice && <Alert tone="green">{notice}</Alert>}

          <div className="flex justify-end">
            <Button type="submit" className="rounded-full px-6" disabled={busy}>
              {busy ? <Spinner className="text-primary-foreground" /> : <Plus className="size-4" />} إضافة إلى {MEAL_LABELS[mealType]} — {fmtDate(`${date}T00:00:00`)}
            </Button>
          </div>
        </form>
      </SectionCard>
      </div>
    </div>
  );
}
