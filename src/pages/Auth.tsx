import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, Check, Eye, EyeOff, LockKeyhole, UserRoundPlus, Video } from 'lucide-react';
import { useSession } from '@/session';
import { useCatalog } from '@/catalog';
import { errorMessage, ApiError } from '@/api';
import { go } from '@/router';
import { Logo } from '@/components/brand';
import { Alert, Badge, Field } from '@/components/ui-kit';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui-kit';
import { CONDITION_LABELS } from '@/utils';
import type { ConditionId } from '@/types';

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const { status, user, login, register, logout } = useSession();
  const { catalog } = useCatalog();
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [condition, setCondition] = useState<ConditionId | ''>('');
  const [gender, setGender] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [height, setHeight] = useState('');

  const isRegister = mode === 'register';
  const conditions = catalog?.conditions ?? (Object.entries(CONDITION_LABELS).map(([id, label]) => ({ id: id as ConditionId, label })));

  useEffect(() => {
    if (status === 'ready' && user) {
      if (user.role === 'dietitian') go('/clinic/overview', { replace: true });
      else go(user.activated_at ? '/app/overview' : '/app/activation', { replace: true });
    }
  }, [status, user]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (!isRegister) {
        const payload = await login(email.trim(), password);
        if (payload.user.role !== 'patient') {
          await logout();
          setError('هذا حساب أخصائي تغذية. الدخول للأخصائي من بوابته المخصصة.');
          setBusy(false);
          return;
        }
        go(payload.user.activated_at ? '/app/overview' : '/app/activation');
        return;
      }
      const body: Record<string, unknown> = { role: 'patient', name, email: email.trim(), password, condition };
      if (phone.trim()) body.phone = phone.trim();
      if (gender) body.gender = gender;
      if (birthYear) body.birth_year = Number(birthYear);
      if (height) body.height_cm = Number(height);
      const payload = await register(body);
      go(payload.user.activated_at ? '/app/overview' : '/app/activation');
    } catch (reason) {
      setError(reason instanceof ApiError && reason.code === 'invalid_condition' ? 'اختر الحالة الصحية للمتابعة.' : errorMessage(reason));
      setBusy(false);
    }
  }

  const switchHref = isRegister ? '#/login' : '#/register';

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Logo />
          <a href={switchHref} className="text-xs font-semibold text-primary hover:underline">
            {isRegister ? 'لديّ حساب — دخول' : 'ليس لديك حساب؟ سجّل الآن'}
          </a>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[.95fr_1.05fr] lg:items-start lg:gap-12 lg:py-14">
        <aside className="order-2 hidden lg:order-1 lg:block">
          <div className="sticky top-8 overflow-hidden rounded-[2rem] border border-border bg-card shadow-xl">
            <img src="/images/online-followup.png" alt="جلسة متابعة تغذية علاجية أونلاين" className="aspect-[4/3] w-full object-cover" width={1536} height={1024} />
            <div className="p-6">
              <Badge tone="green"><Video className="size-3.5" /> المتابعة إلكترونية فقط</Badge>
              <h2 className="mt-3 text-xl font-bold">عيادة تغذية علاجية من بيتك</h2>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                أنشئ حسابك، احجز استشارتك، وتابع طعامك وقياساتك وخطتك الغذائية مع أخصائي التغذية — من خلال الموقع بالكامل.
              </p>
              <ul className="mt-4 space-y-2.5 text-xs text-muted-foreground">
                {['سجل طعام وسعرات يومي', 'متابعة السكر والضغط والوزن', 'خطة غذائية لكل حالة', 'مواعيد ورابط متابعة داخل حسابك'].map((line) => (
                  <li key={line} className="flex items-center gap-2"><span className="flex size-5 items-center justify-center rounded-full bg-secondary text-primary"><Check className="size-3" /></span>{line}</li>
                ))}
              </ul>
            </div>
          </div>
        </aside>

        <section className="order-1 lg:order-2">
          <div className="card-soft mx-auto w-full max-w-xl p-5 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{isRegister ? 'أنشئ حسابك أولًا' : 'تسجيل الدخول'}</h1>
                <p className="mt-1 text-xs leading-6 text-muted-foreground sm:text-sm">
                  {isRegister ? 'إنشاء حساب المريض خطوة مطلوبة قبل الحجز والدفع والمتابعة أونلاين.' : 'ادخل ببريدك الإلكتروني وكلمة المرور إلى سجل طعامك وقياساتك وخطتك الغذائية.'}
                </p>
              </div>
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
                {isRegister ? <UserRoundPlus className="size-5" /> : <LockKeyhole className="size-5" />}
              </span>
            </div>

            <form className="mt-5 space-y-4" onSubmit={onSubmit} noValidate>
              {isRegister && (
                <Field label="الاسم الكامل" htmlFor="name">
                  <input id="name" className="input-base" value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={80} autoComplete="name" placeholder="مثال: مريم فتحي" />
                </Field>
              )}

              <Field label="البريد الإلكتروني" htmlFor="email">
                <input id="email" type="email" dir="ltr" className="input-base text-right" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" placeholder="name@example.com" />
              </Field>

              {isRegister && (
                <Field label="رقم الهاتف (اختياري)" htmlFor="phone" hint="يستخدمه الأخصائي للتواصل عند الحاجة خلال المتابعة.">
                  <input id="phone" type="tel" dir="ltr" className="input-base text-right" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" placeholder="01012345678" />
                </Field>
              )}

              <Field label="كلمة المرور" htmlFor="password" hint={isRegister ? '8 أحرف على الأقل.' : undefined}>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className="input-base pl-11"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    minLength={isRegister ? 8 : undefined}
                    maxLength={200}
                    autoComplete={isRegister ? 'new-password' : 'current-password'}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute inset-y-0 left-2 my-auto flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                    aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </Field>

              {isRegister && (
                <>
                  <Field label="الحالة الصحية" htmlFor="condition">
                    <select id="condition" className="input-base select-base" value={condition} onChange={(event) => setCondition(event.target.value as ConditionId)} required>
                      <option value="" disabled>اختر الحالة التي تتابع من أجلها</option>
                      {conditions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                    </select>
                  </Field>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="النوع (اختياري)" htmlFor="gender">
                      <select id="gender" className="input-base select-base" value={gender} onChange={(event) => setGender(event.target.value)}>
                        <option value="">غير محدد</option>
                        <option value="female">أنثى</option>
                        <option value="male">ذكر</option>
                      </select>
                    </Field>
                    <Field label="سنة الميلاد" htmlFor="birth_year">
                      <input id="birth_year" type="number" inputMode="numeric" min={1920} max={new Date().getFullYear() - 10} className="input-base" value={birthYear} onChange={(event) => setBirthYear(event.target.value)} placeholder="1992" />
                    </Field>
                    <Field label="الطول (سم)" htmlFor="height_cm">
                      <input id="height_cm" type="number" inputMode="numeric" min={110} max={230} className="input-base" value={height} onChange={(event) => setHeight(event.target.value)} placeholder="170" />
                    </Field>
                  </div>
                </>
              )}

              {error && <Alert tone="red">{error}</Alert>}

              <Button type="submit" className="h-11 w-full rounded-full text-sm" disabled={busy}>
                {busy ? <Spinner className="text-primary-foreground" /> : null}
                {isRegister ? 'إنشاء الحساب' : 'دخول'}
                {!busy && <ArrowLeft className="size-4" />}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                {isRegister ? 'لديك حساب بالفعل؟ ' : 'جديد هنا؟ '}
                <a href={switchHref} className="font-semibold text-primary hover:underline">{isRegister ? 'سجّل الدخول' : 'أنشئ حسابًا'}</a>
              </p>
            </form>
          </div>

          <p className="mx-auto mt-4 max-w-xl text-center text-[11px] leading-6 text-muted-foreground">
            باستخدامك الموقع فأنت توافق على أن المحتوى إرشادي ولا يغني عن الطبيب المعالج. المتابعة الغذائية إلكترونية بالكامل.
          </p>
        </section>
      </main>
    </div>
  );
}
