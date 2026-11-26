import type {
  AppointmentKind, AppointmentStatus, ConditionId, MealType, PaymentKind,
} from './types';

export const CONDITION_LABELS: Record<ConditionId, string> = {
  obesity: 'السمنة وزيادة الوزن',
  underweight: 'النحافة وقلة الوزن',
  heart: 'أمراض القلب',
  hypertension: 'ارتفاع ضغط الدم',
  diabetes: 'السكري',
  thyroid: 'الغدة الدرقية',
};

export const CHRONIC_CONDITIONS: ConditionId[] = ['hypertension', 'heart', 'diabetes', 'thyroid', 'obesity', 'underweight'];

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'الإفطار',
  snack_am: 'سناك صباحي',
  lunch: 'الغداء',
  snack_pm: 'سناك عصر',
  dinner: 'العشاء',
};

export const MEAL_TIMES: Record<MealType, string> = {
  breakfast: '8:00 ص',
  snack_am: '11:00 ص',
  lunch: '2:00 م',
  snack_pm: '5:00 م',
  dinner: '8:00 م',
};

// 3 main meals + 2 snacks, roughly 3 hours apart.
export const MEAL_ORDER: MealType[] = ['breakfast', 'snack_am', 'lunch', 'snack_pm', 'dinner'];

export const MEAL_SHARES: Record<MealType, number> = {
  breakfast: 0.25,
  snack_am: 0.1,
  lunch: 0.35,
  snack_pm: 0.1,
  dinner: 0.2,
};

export function mealSlotForNow(hour = new Date().getHours()): MealType {
  if (hour < 9) return 'breakfast';
  if (hour < 12) return 'snack_am';
  if (hour < 15) return 'lunch';
  if (hour < 18) return 'snack_pm';
  return 'dinner';
}

export const APPOINTMENT_LABELS: Record<AppointmentKind, string> = {
  consultation: 'استشارة أولى',
  monthly: 'متابعة شهرية',
  plan_review: 'مراجعة الخطة',
};

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  requested: 'بانتظار التأكيد',
  confirmed: 'مؤكد',
  completed: 'مكتمل',
  cancelled: 'ملغي',
};

export const PAYMENT_LABELS: Record<PaymentKind, string> = {
  consultation: 'استشارة أولى',
  monthly: 'متابعة شهرية',
  quarter: 'خطة 3 شهور',
};

export const METHOD_LABELS: Record<string, string> = {
  vodafone_cash: 'فودافون كاش',
  card: 'بطاقة بنكية',
  fawry: 'فوري',
  wallet: 'محفظة إلكترونية',
  manual: 'تفعيل يدوي',
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'بانتظار التأكيد',
  paid: 'مؤكد',
  rejected: 'مرفوض',
};

const dateFmt = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' });
const shortFmt = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { day: 'numeric', month: 'short' });
const weekdayFmt = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { weekday: 'short' });
const timeFmt = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { hour: 'numeric', minute: '2-digit' });

export function fmtDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return dateFmt.format(date);
}

export function fmtShort(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return shortFmt.format(date);
}

export function fmtWeekday(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return weekdayFmt.format(date);
}

export function fmtTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return timeFmt.format(date);
}

export function fmtDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  return `${fmtDate(value)} • ${fmtTime(value)}`;
}

export function fmtMoney(amount: number | null | undefined): string {
  const value = Number(amount ?? 0);
  return `${value.toLocaleString('en-US')} ج.م`;
}

export function todayInput(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function shiftDate(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function daysLeft(endsAt: string | null | undefined): number {
  if (!endsAt) return 0;
  return Math.max(0, Math.ceil((Date.parse(endsAt) - Date.now()) / 86400000));
}

export function bmiOf(weightKg: number | null | undefined, heightCm: number | null | undefined): number | null {
  if (!weightKg || !heightCm) return null;
  const meters = heightCm / 100;
  return Math.round((weightKg / (meters * meters)) * 10) / 10;
}

export function bmiBand(bmi: number | null): { label: string; tone: 'green' | 'amber' | 'red' | 'slate' } {
  if (bmi == null) return { label: 'أدخل الطول والوزن', tone: 'slate' };
  if (bmi < 18.5) return { label: 'نحافة', tone: 'amber' };
  if (bmi < 25) return { label: 'وزن صحي', tone: 'green' };
  if (bmi < 30) return { label: 'زيادة وزن', tone: 'amber' };
  return { label: 'سمنة', tone: 'red' };
}

export function waistBand(
  waistCm: number | null | undefined,
  gender: 'male' | 'female' | null,
): { label: string; tone: 'green' | 'amber' | 'red' | 'slate' } {
  if (!waistCm) return { label: 'لم يُسجل', tone: 'slate' };
  const male = gender !== 'female';
  if (male ? waistCm >= 102 : waistCm >= 88) return { label: 'خطر مرتفع', tone: 'red' };
  if (male ? waistCm >= 94 : waistCm >= 80) return { label: 'خطر متوسط', tone: 'amber' };
  return { label: 'ضمن النطاق', tone: 'green' };
}

export function waistToHeight(waistCm: number | null | undefined, heightCm: number | null | undefined): number | null {
  if (!waistCm || !heightCm) return null;
  return Math.round((waistCm / heightCm) * 100) / 100;
}

export function bpBand(systolic: number | null, diastolic: number | null): { label: string; tone: 'green' | 'amber' | 'red' | 'slate' } {
  if (systolic == null || diastolic == null) return { label: '—', tone: 'slate' };
  if (systolic >= 140 || diastolic >= 90) return { label: 'مرتفع', tone: 'red' };
  if (systolic < 90 || diastolic < 60) return { label: 'منخفض', tone: 'amber' };
  if (systolic >= 130 || diastolic >= 85) return { label: 'حدّي', tone: 'amber' };
  return { label: 'طبيعي', tone: 'green' };
}

export function glucoseBand(
  glucose: number | null,
  context: 'fasting' | 'post_meal' | 'random' | null,
): { label: string; tone: 'green' | 'amber' | 'red' | 'slate' } {
  if (glucose == null) return { label: '—', tone: 'slate' };
  if (context === 'fasting') {
    if (glucose >= 126) return { label: 'مرتفع', tone: 'red' };
    if (glucose >= 100) return { label: 'ما قبل السكري', tone: 'amber' };
    if (glucose < 70) return { label: 'منخفض', tone: 'amber' };
    return { label: 'طبيعي', tone: 'green' };
  }
  if (glucose >= 200) return { label: 'مرتفع جدًا', tone: 'red' };
  if (glucose >= 140) return { label: 'مرتفع', tone: 'amber' };
  if (glucose < 70) return { label: 'منخفض', tone: 'amber' };
  return { label: 'طبيعي', tone: 'green' };
}

export function ageFromYear(year: number | null): string {
  if (!year) return '—';
  return `${new Date().getFullYear() - year} سنة`;
}

export function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('');
}

export function localDateLabel(date: Date): string {
  return `${fmtWeekday(date)}، ${fmtShort(date)}`;
}

export function toLocalDateTimeInput(value: Date | string | null | undefined): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export function fromLocalDateTimeInput(value: string): string {
  return new Date(value).toISOString();
}

export function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'صباح الخير';
  if (hour < 18) return 'مساء الخير';
  return 'مساء الخير';
}

export function sum(values: Array<number | null | undefined>): number {
  return values.reduce<number>((total, value) => total + (value ?? 0), 0);
}
