import { useState, type FormEvent } from 'react';
import { CheckCircle2, KeyRound, Ruler, Save, UserRound } from 'lucide-react';
import { useSession } from '@/session';
import { api, errorMessage } from '@/api';
import { Alert, Badge, SectionCard, Spinner } from '@/components/ui-kit';
import { Button } from '@/components/ui/button';
import { CONDITION_LABELS, CHRONIC_CONDITIONS } from '@/utils';
import type { ConditionId, User } from '@/types';

export function PatientProfile() {
  const { user, updateUser, logout } = useSession();
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [gender, setGender] = useState(user?.gender ?? '');
  const [birthYear, setBirthYear] = useState(user?.birth_year ? String(user.birth_year) : '');
  const [height, setHeight] = useState(user?.height_cm ? String(user.height_cm) : '');
  const [waist, setWaist] = useState(user?.waist_cm ? String(user.waist_cm) : '');
  const [arm, setArm] = useState(user?.arm_cm ? String(user.arm_cm) : '');
  const [targetWeight, setTargetWeight] = useState(user?.target_weight ? String(user.target_weight) : '');
  const [targetCalories, setTargetCalories] = useState(user?.target_calories ? String(user.target_calories) : '');
  const [condition, setCondition] = useState<ConditionId | ''>(user?.condition ?? '');
  const [conditions, setConditions] = useState<ConditionId[]>(user?.conditions ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);

  if (!user) return null;

  function toggleCondition(id: ConditionId) {
    setConditions((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const result = await api<{ user: User }>('/api/profile', {
        method: 'PATCH',
        body: {
          name,
          phone,
          ...(gender ? { gender } : {}),
          ...(birthYear ? { birth_year: Number(birthYear) } : {}),
          ...(height ? { height_cm: Number(height) } : {}),
          ...(waist ? { waist_cm: Number(waist) } : {}),
          ...(arm ? { arm_cm: Number(arm) } : {}),
          ...(targetWeight ? { target_weight: Number(targetWeight) } : {}),
          ...(targetCalories ? { target_calories: Number(targetCalories) } : {}),
          ...(condition ? { condition } : {}),
          conditions,
        },
      });
      updateUser(result.user);
      setNotice('تم حفظ بياناتك.');
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  async function changePassword(event: FormEvent) {
    event.preventDefault();
    setPasswordError(null);
    setPasswordNotice(null);
    setPasswordBusy(true);
    try {
      await api('/api/auth/password', { method: 'POST', body: { current_password: currentPassword, new_password: newPassword } });
      setCurrentPassword('');
      setNewPassword('');
      setPasswordNotice('تم تغيير كلمة المرور.');
    } catch (reason) {
      setPasswordError(errorMessage(reason));
    } finally {
      setPasswordBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">حسابي وبياناتي الصحية</h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">حدّث قياساتك وأمراضك المزمنة لتبقى خطتك مناسبة لك.</p>
        </div>
        <Badge tone="green"><UserRound className="size-3.5" /> حساب مريض</Badge>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
        <SectionCard title="البيانات الأساسية" description="الاسم وبيانات التواصل تظهر للأخصائي داخل المتابعة.">
          <form onSubmit={save} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" htmlFor="p-name">الاسم</label>
                <input id="p-name" className="input-base" value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={80} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" htmlFor="p-phone">الهاتف</label>
                <input id="p-phone" dir="ltr" className="input-base text-right" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="01012345678" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" htmlFor="p-email">البريد الإلكتروني</label>
                <input id="p-email" dir="ltr" className="input-base bg-muted/60 text-right" value={user.email} readOnly />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" htmlFor="p-gender">النوع</label>
                <select id="p-gender" className="input-base select-base" value={gender} onChange={(event) => setGender(event.target.value as typeof gender)}>
                  <option value="">غير محدد</option>
                  <option value="female">أنثى</option>
                  <option value="male">ذكر</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1 text-xs font-bold text-muted-foreground"><Ruler className="size-4" /> القياسات</div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { id: 'p-birth', label: 'سنة الميلاد', value: birthYear, set: setBirthYear, min: 1920, max: new Date().getFullYear() - 10, placeholder: '1992' },
                { id: 'p-height', label: 'الطول (سم)', value: height, set: setHeight, min: 110, max: 230, placeholder: '170' },
                { id: 'p-waist', label: 'محيط الخصر (سم)', value: waist, set: setWaist, min: 40, max: 250, placeholder: '96' },
                { id: 'p-arm', label: 'محيط الذراع (سم)', value: arm, set: setArm, min: 15, max: 80, placeholder: '30' },
                { id: 'p-target-weight', label: 'الوزن المستهدف (كجم)', value: targetWeight, set: setTargetWeight, min: 25, max: 350, placeholder: '75' },
                { id: 'p-target-cal', label: 'هدف السعرات', value: targetCalories, set: setTargetCalories, min: 800, max: 5000, placeholder: '1800' },
              ].map((field) => (
                <div key={field.id} className="space-y-1.5">
                  <label className="text-xs font-semibold" htmlFor={field.id}>{field.label}</label>
                  <input id={field.id} type="number" inputMode="numeric" min={field.min} max={field.max} className="input-base" value={field.value} onChange={(event) => field.set(event.target.value)} placeholder={field.placeholder} />
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold" htmlFor="p-condition">الحالة الأساسية</label>
              <select id="p-condition" className="input-base select-base" value={condition} onChange={(event) => setCondition(event.target.value as ConditionId)}>
                <option value="" disabled>اختر الحالة الأساسية</option>
                {CHRONIC_CONDITIONS.map((id) => <option key={id} value={id}>{CONDITION_LABELS[id]}</option>)}
              </select>
            </div>

            <div>
              <p className="text-xs font-semibold">الأمراض المزمنة الشائعة</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {CHRONIC_CONDITIONS.map((id) => {
                  const active = conditions.includes(id);
                  return (
                    <button key={id} type="button" onClick={() => toggleCondition(id)} aria-pressed={active}
                      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium ${active ? 'border-primary bg-secondary text-primary' : 'border-border bg-card text-muted-foreground hover:bg-muted'}`}>
                      {active ? <CheckCircle2 className="size-3.5" /> : <span className="size-3.5 rounded-full border border-current opacity-40" />}
                      {CONDITION_LABELS[id]}
                    </button>
                  );
                })}
              </div>
            </div>

            {error && <Alert tone="red">{error}</Alert>}
            {notice && <Alert tone="green">{notice}</Alert>}
            <div className="flex justify-end">
              <Button type="submit" className="rounded-full px-6" disabled={busy}>
                {busy ? <Spinner className="text-primary-foreground" /> : <Save className="size-4" />} حفظ التغييرات
              </Button>
            </div>
          </form>
        </SectionCard>

        <div className="space-y-4">
          <SectionCard title="تقييم قياساتك" description="ملخص سريع يعتمد على بيانات ملفك.">
            <ul className="space-y-2 text-xs">
              <li className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2"><span className="text-muted-foreground">الطول</span><span className="font-semibold">{user.height_cm ?? '—'} سم</span></li>
              <li className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2"><span className="text-muted-foreground">محيط الخصر</span><span className="font-semibold">{user.waist_cm ?? '—'} سم</span></li>
              <li className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2"><span className="text-muted-foreground">محيط الذراع</span><span className="font-semibold">{user.arm_cm ?? '—'} سم</span></li>
              <li className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2"><span className="text-muted-foreground">الأمراض المسجلة</span><span className="font-semibold">{user.conditions.length || '—'}</span></li>
            </ul>
            <a href="#/app/assessment" className="mt-3 inline-flex text-xs font-semibold text-primary hover:underline">فتح صفحة التقييم الكاملة ←</a>
          </SectionCard>

          <SectionCard title="تغيير كلمة المرور">
            <form onSubmit={changePassword} className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" htmlFor="current-password">كلمة المرور الحالية</label>
                <input id="current-password" type="password" className="input-base" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required autoComplete="current-password" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" htmlFor="new-password">كلمة المرور الجديدة</label>
                <input id="new-password" type="password" className="input-base" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required minLength={8} autoComplete="new-password" />
                <p className="text-[10px] text-muted-foreground">8 أحرف على الأقل.</p>
              </div>
              {passwordError && <Alert tone="red">{passwordError}</Alert>}
              {passwordNotice && <Alert tone="green">{passwordNotice}</Alert>}
              <Button type="submit" variant="outline" className="w-full rounded-full" disabled={passwordBusy}>
                {passwordBusy ? <Spinner /> : <KeyRound className="size-4" />} تحديث كلمة المرور
              </Button>
            </form>
          </SectionCard>

          <Button type="button" variant="outline" className="w-full rounded-full text-red-700" onClick={() => void logout()}>تسجيل الخروج</Button>
        </div>
      </div>
    </div>
  );
}
