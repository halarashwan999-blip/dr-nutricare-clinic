import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import {
  ArrowLeft, CalendarClock, Eye, EyeOff, FileCheck2, LockKeyhole, ShieldCheck, Stethoscope, Users,
} from 'lucide-react';
import { useSession } from '@/session';
import { errorMessage } from '@/api';
import { go } from '@/router';
import { Spinner } from '@/components/ui-kit';

const inputClass = 'w-full rounded-xl border border-white/15 bg-[#041813]/70 px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 transition-colors focus:border-emerald-300/60 focus:outline-none focus:ring-2 focus:ring-emerald-300/15';

const portalNotes = [
  { icon: Users, title: 'ملفات المرضى', text: 'القياسات وسجل الطعام وصور InBody والاستفسارات في مكان واحد.' },
  { icon: FileCheck2, title: 'مراجعة الخطط قبل الإرسال', text: 'لا تصل أي خطة للمريض إلا بعد اعتماد الأخصائي.' },
  { icon: CalendarClock, title: 'مواعيد المتابعة', text: 'تأكيد المواعيد وإضافة رابط المكالمة داخل حساب المريض.' },
  { icon: LockKeyhole, title: 'دخول خاص ومحمي', text: 'البوابة باسم المستخدم وكلمة المرور، منفصلة تمامًا عن بوابة المرضى.' },
];

function PortalField({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-[11px] font-semibold text-emerald-100/80">{label}</label>
      {children}
      {hint && <p className="text-[10px] leading-5 text-emerald-200/50">{hint}</p>}
    </div>
  );
}

export function SpecialistAuth({ mode }: { mode: 'login' | 'register' }) {
  const { status, user, login, register, logout } = useSession();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRegister = mode === 'register';

  useEffect(() => {
    if (status === 'ready' && user?.role === 'dietitian') go('/clinic/overview', { replace: true });
  }, [status, user]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (!isRegister) {
        const payload = await login(username.trim(), password);
        if (payload.user.role !== 'dietitian') {
          await logout();
          setError('هذا الحساب حساب مريض. الدخول للمرضى من بوابة المرضى.');
          setBusy(false);
          return;
        }
        go('/clinic/overview');
        return;
      }
      const body: Record<string, unknown> = {
        role: 'dietitian',
        name,
        username: username.trim().toLowerCase(),
        password,
        access_code: accessCode,
      };
      if (phone.trim()) body.phone = phone.trim();
      await register(body);
      go('/clinic/overview');
    } catch (reason) {
      setError(errorMessage(reason));
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#06231c] text-emerald-50">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_8%,rgba(52,211,153,0.18),transparent_45%),radial-gradient(circle_at_88%_92%,rgba(16,185,129,0.14),transparent_42%)]"
      />
      <div className="relative mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-3">
          <a href="#/clinic/login" className="flex items-center gap-3" aria-label="بوابة أخصائي التغذية">
            <span className="flex size-10 items-center justify-center rounded-2xl border border-emerald-300/30 bg-emerald-400/10 text-emerald-300">
              <Stethoscope className="size-5" />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-bold text-white" dir="ltr">Dr. NutriCare Clinic</span>
              <span className="block text-[10px] text-emerald-200/60">بوابة أخصائي التغذية</span>
            </span>
          </a>
          <span className="hidden items-center gap-1.5 rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-1 text-[10px] font-semibold text-emerald-200 sm:inline-flex">
            <ShieldCheck className="size-3.5" /> دخول محمي
          </span>
        </header>

        <main className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1.05fr_.95fr] lg:gap-16">
          <section className="order-2 hidden lg:order-1 lg:block">
            <h1 className="text-3xl font-bold leading-snug text-white">
              مساحة عمل الأخصائي
              <span className="block text-emerald-300">منفصلة عن بوابة المرضى</span>
            </h1>
            <p className="mt-4 max-w-md text-sm leading-7 text-emerald-100/60">
              هذه الصفحة مخصصة لأخصائي التغذية فقط. ادخل باسم المستخدم وكلمة المرور، ثم راجع ملفات المرضى واعتمد الخطط الغذائية وحدد المواعيد.
            </p>
            <ul className="mt-8 space-y-4">
              {portalNotes.map((note) => (
                <li key={note.title} className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border border-emerald-300/20 bg-emerald-400/10 text-emerald-300">
                    <note.icon className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-emerald-50">{note.title}</p>
                    <p className="mt-0.5 text-xs leading-6 text-emerald-100/50">{note.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="order-1 mx-auto w-full max-w-md lg:order-2">
            <form onSubmit={onSubmit} noValidate className="rounded-[1.75rem] border border-white/10 bg-white/[0.055] p-6 shadow-2xl backdrop-blur sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold tracking-wider text-emerald-300/80">دخول خاص</p>
                  <h2 className="mt-1 text-2xl font-bold text-white">{isRegister ? 'إنشاء حساب الأخصائي' : 'تسجيل الدخول'}</h2>
                  <p className="mt-1 text-xs leading-6 text-emerald-100/60">
                    {isRegister ? 'كود التفعيل مطلوب مرة واحدة عند إنشاء الحساب.' : 'باسم المستخدم وكلمة المرور فقط.'}
                  </p>
                </div>
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-400/10 text-emerald-300">
                  <LockKeyhole className="size-5" />
                </span>
              </div>

              <div className="mt-6 space-y-4">
                {isRegister && (
                  <PortalField label="الاسم الكامل" htmlFor="sp-name">
                    <input id="sp-name" className={inputClass} value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={80} autoComplete="name" placeholder="هالة رشوان" />
                  </PortalField>
                )}

                <PortalField
                  label="اسم المستخدم"
                  htmlFor="sp-username"
                  hint={isRegister ? 'حروف إنجليزية صغيرة أو أرقام من 3 إلى 32 حرفًا، بدون مسافات.' : undefined}
                >
                  <input
                    id="sp-username"
                    dir="ltr"
                    className={`${inputClass} text-right font-mono`}
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    required
                    pattern="[A-Za-z0-9][A-Za-z0-9._-]{2,31}"
                    autoComplete="username"
                    placeholder="hala.rashwan"
                  />
                </PortalField>

                <PortalField label="كلمة المرور" htmlFor="sp-password">
                  <div className="relative">
                    <input
                      id="sp-password"
                      type={showPassword ? 'text' : 'password'}
                      className={`${inputClass} pl-11`}
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
                      className="absolute inset-y-0 left-2 my-auto flex size-8 items-center justify-center rounded-lg text-emerald-200/60 hover:bg-white/10 hover:text-emerald-100"
                      aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </PortalField>

                {isRegister && (
                  <>
                    <PortalField label="رقم الهاتف (اختياري)" htmlFor="sp-phone">
                      <input id="sp-phone" type="tel" dir="ltr" className={`${inputClass} text-right`} value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" placeholder="01012345678" />
                    </PortalField>

                    <PortalField label="كود تفعيل الأخصائي" htmlFor="sp-code" hint="يُمنح لك بشكل خاص. بدونه لا يمكن إنشاء الحساب.">
                      <input id="sp-code" dir="ltr" className={`${inputClass} text-right font-mono`} value={accessCode} onChange={(event) => setAccessCode(event.target.value)} required autoComplete="off" placeholder="GHIZAI-••••" />
                    </PortalField>

                    <div className="rounded-xl border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-[11px] leading-6 text-amber-100">
                      حساب الأخصائي يتيح الوصول لبيانات المرضى. كود التفعيل وكلمة المرور أسرار — لا تشاركها مع أي شخص.
                    </div>
                  </>
                )}

                {error && <div role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-xs leading-6 text-red-100">{error}</div>}

                <button
                  type="submit"
                  disabled={busy}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-emerald-400 text-sm font-bold text-emerald-950 transition-colors hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {busy ? <Spinner className="text-emerald-950" /> : null}
                  {isRegister ? 'إنشاء حساب الأخصائي' : 'دخول البوابة'}
                  {!busy && <ArrowLeft className="size-4" />}
                </button>

                <p className="text-center text-[11px] text-emerald-100/50">
                  {isRegister ? 'لديك حساب أخصائي بالفعل؟ ' : 'أول مرة على البوابة؟ '}
                  <a href={isRegister ? '#/clinic/login' : '#/clinic/register'} className="font-semibold text-emerald-300 hover:underline">
                    {isRegister ? 'دخول البوابة' : 'أنشئ الحساب بكود التفعيل'}
                  </a>
                </p>
              </div>
            </form>

            <p className="mx-auto mt-4 max-w-md text-center text-[10px] leading-5 text-emerald-200/40">
              هذه البوابة مخصصة لأخصائي التغذية المعتمد فقط. المرضى يدخلون من بوابتهم المستقلة.
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}
