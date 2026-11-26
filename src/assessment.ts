import type { ConditionId } from './types';
import { bmiBand, waistBand, waistToHeight } from './utils';

export interface AssessmentInput {
  weight: number | null;
  height: number | null;
  waist: number | null;
  arm: number | null;
  gender: 'male' | 'female' | null;
  conditions: ConditionId[];
  systolic?: number | null;
  diastolic?: number | null;
  glucose?: number | null;
  glucoseContext?: 'fasting' | 'post_meal' | 'random' | null;
}

export interface AssessmentFlag {
  tone: 'green' | 'amber' | 'red' | 'blue';
  title: string;
  text: string;
}

export interface Assessment {
  bmi: number | null;
  bmiLabel: string;
  bmiTone: 'green' | 'amber' | 'red' | 'slate';
  healthyLow: number | null;
  healthyHigh: number | null;
  waistLabel: string;
  waistTone: 'green' | 'amber' | 'red' | 'slate';
  whtr: number | null;
  armLabel: string;
  armTone: 'green' | 'amber' | 'red' | 'slate';
  summary: string;
  flags: AssessmentFlag[];
  focus: string[];
}

export function assessHealth(input: AssessmentInput): Assessment {
  const { weight, height, waist, arm, gender, conditions } = input;
  const meters = height ? height / 100 : null;
  const bmi = weight && meters ? Math.round((weight / (meters * meters)) * 10) / 10 : null;
  const band = bmiBand(bmi);
  const healthyLow = meters ? Math.round(18.5 * meters * meters) : null;
  const healthyHigh = meters ? Math.round(24.9 * meters * meters) : null;
  const waistInfo = waistBand(waist, gender);
  const whtr = waistToHeight(waist, height);
  const armLabel = arm == null ? 'لم يُسجل' : arm < 23 ? 'أقل من النطاق المعتاد' : arm <= 34 ? 'ضمن النطاق المعتاد' : 'أعلى من النطاق المعتاد';
  const armTone: Assessment['armTone'] = arm == null ? 'slate' : arm < 23 || arm > 34 ? 'amber' : 'green';

  const flags: AssessmentFlag[] = [];
  if (bmi != null) {
    if (bmi >= 30) flags.push({ tone: 'red', title: 'السمنة', text: `مؤشر كتلة الجسم ${bmi} يقع في نطاق السمنة. الخطة ستستهدف خسارة وزن تدريجية آمنة (5–10% خلال 3 أشهر) مع الحفاظ على البروتين والألياف.` });
    else if (bmi >= 25) flags.push({ tone: 'amber', title: 'زيادة الوزن', text: `مؤشر كتلة الجسم ${bmi} يشير إلى زيادة وزن. نبدأ بعجز سعرات معتدل وتعديل العادات اليومية.` });
    else if (bmi < 18.5) flags.push({ tone: 'amber', title: 'نحافة', text: `مؤشر كتلة الجسم ${bmi} أقل من النطاق الصحي. الخطة سترفع السعرات بجودة غذائية عالية ووجبات متكررة.` });
    else flags.push({ tone: 'green', title: 'وزن ضمن النطاق الصحي', text: `مؤشر كتلة الجسم ${bmi} ضمن النطاق الصحي. الهدف الحفاظ على الوزن مع تحسين جودة الطعام.` });
  }

  if (waist) {
    if (waistInfo.tone === 'red') flags.push({ tone: 'red', title: 'دهون مركزية مرتفعة', text: `محيط الخصر ${waist} سم يزيد خطر مشكلات القلب والسكري. تقليل محيط الخصر سيكون هدفًا أساسيًا.` });
    else if (waistInfo.tone === 'amber') flags.push({ tone: 'amber', title: 'محيط خصر يستحق الانتباه', text: `محيط الخصر ${waist} سم في النطاق المتوسط. تقليل 3–5 سم يحسّن المؤشرات الصحية.` });
    else flags.push({ tone: 'green', title: 'محيط خصر مطمئن', text: `محيط الخصر ${waist} سم ضمن النطاق الأقل خطرًا.` });
  }

  if (whtr != null && whtr > 0.5) {
    flags.push({ tone: 'amber', title: 'نسبة الخصر إلى الطول مرتفعة', text: `النسبة ${whtr}. الأفضل أن يقل محيط الخصر عن نصف طولك.` });
  }

  if (conditions.includes('hypertension')) flags.push({ tone: 'blue', title: 'متابعة الضغط', text: 'الخطة ستكون قليلة الصوديوم وغنية بالبوتاسيوم، مع تسجيل الضغط صباحًا ومساءً داخل حسابك.' });
  if (conditions.includes('diabetes')) flags.push({ tone: 'blue', title: 'متابعة السكر', text: 'سيتم توزيع الكربوهيدرات على الوجبات مع اختيار أطعمة منخفضة المؤشر الجلايسيمي وتسجيل القراءات.' });
  if (conditions.includes('heart')) flags.push({ tone: 'blue', title: 'صحة القلب', text: 'التركيز على الدهون الصحية والأوميغا 3 والألياف، وتقليل الدهون المشبعة والملح.' });
  if (conditions.includes('thyroid')) flags.push({ tone: 'blue', title: 'الغدة الدرقية', text: 'مراعاة مواعيد دواء الغدة، واليود والسيلينيوم باعتدال، وإعادة التحاليل حسب توجيه الطبيب.' });

  if (input.systolic != null && input.diastolic != null && (input.systolic >= 140 || input.diastolic >= 90)) {
    flags.push({ tone: 'red', title: 'قراءة ضغط مرتفعة', text: `آخر قراءة ${input.systolic}/${input.diastolic}. أعد القياس في وقت آخر، وأبلغ طبيبك إن تكرر الارتفاع.` });
  }
  if (input.glucose != null) {
    const high = input.glucoseContext === 'fasting' ? input.glucose >= 126 : input.glucose >= 200;
    if (high) flags.push({ tone: 'red', title: 'قراءة سكر مرتفعة', text: `آخر قراءة ${input.glucose} mg/dL. تابع القراءات وأبلغ طبيبك، وستُراجع في المتابعة.` });
  }

  const concerns = circumstancesSummary(bmi, waistInfo.tone, conditions);
  const summary = bmi == null
    ? 'أكمل بيانات الوزن والطول لعرض تقييمك.'
    : `تقييمك المبدئي: ${band.label}${waist ? `، ومحيط خصر ${waistInfo.label}` : ''}. ${concerns}`;

  const focus: string[] = [];
  if (bmi != null && bmi >= 25) focus.push('خسارة وزن تدريجية 0.5–1 كجم أسبوعيًا', 'بروتين كافٍ للحفاظ على العضلات', 'ألياف وخضار في كل وجبة');
  if (bmi != null && bmi < 18.5) focus.push('زيادة سعرات تدريجية بوجبات متكررة', 'مصادر بروتين ودهون صحية', 'تمرين مقاومة بسيط');
  if (waistInfo.tone === 'red' || waistInfo.tone === 'amber') focus.push('تقليل السكريات والمشروبات المحلاة', 'مشي 30 دقيقة معظم الأيام');
  if (conditions.includes('hypertension')) focus.push('ملح أقل من 5 جم يوميًا', 'تسجيل الضغط يوميًا');
  if (conditions.includes('diabetes')) focus.push('توزيع الكربوهيدرات بانتظام', 'تسجيل السكر قبل/بعد الوجبات');
  if (conditions.includes('thyroid')) focus.push('دواء الغدة قبل الإفطار بـ30 دقيقة', 'مصادر يود وسيلينيوم معتدلة');
  if (focus.length === 0) focus.push('الحفاظ على العادات الصحية الحالية', 'متابعة الوزن والقياسات شهريًا');

  return {
    bmi,
    bmiLabel: band.label,
    bmiTone: band.tone,
    healthyLow,
    healthyHigh,
    waistLabel: waistInfo.label,
    waistTone: waistInfo.tone,
    whtr,
    armLabel,
    armTone,
    summary,
    flags,
    focus: [...new Set(focus)],
  };
}

function circumstancesSummary(
  bmi: number | null,
  waistTone: 'green' | 'amber' | 'red' | 'slate',
  conditions: ConditionId[],
): string {
  const parts: string[] = [];
  if (bmi != null && bmi >= 30) parts.push('نبدأ بخطة تدريجية آمنة');
  if (waistTone === 'red') parts.push('مع أولوية لتقليل دهون البطن');
  if (conditions.length > 0) parts.push('ونراعي الأمراض المزمنة المسجلة');
  return parts.length ? `${parts.join('، ')}.` : 'حافظ على نمطك الصحي مع متابعة دورية.';
}
