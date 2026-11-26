export type Role = 'patient' | 'dietitian';
export type ConditionId = 'obesity' | 'underweight' | 'heart' | 'hypertension' | 'diabetes' | 'thyroid';
export type PaymentKind = 'consultation' | 'monthly' | 'quarter';
export type MealType = 'breakfast' | 'snack_am' | 'lunch' | 'snack_pm' | 'dinner';
export type AppointmentKind = 'consultation' | 'monthly' | 'plan_review';
export type AppointmentStatus = 'requested' | 'confirmed' | 'completed' | 'cancelled';

export interface User {
  id: string;
  role: Role;
  email?: string;
  username?: string | null;
  name: string;
  phone: string | null;
  condition: ConditionId | null;
  gender: 'male' | 'female' | null;
  birth_year: number | null;
  height_cm: number | null;
  target_weight: number | null;
  target_calories: number | null;
  waist_cm: number | null;
  arm_cm: number | null;
  conditions: ConditionId[];
  activated_at: string | null;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  kind: Exclude<PaymentKind, 'consultation'>;
  starts_at: string;
  ends_at: string;
  amount: number;
  status: string;
  payment_id: string;
  created_at: string;
}

export interface Payment {
  id: string;
  kind: PaymentKind;
  amount: number;
  method: string;
  status: 'pending' | 'paid' | 'rejected' | string;
  reference: string;
  sender_phone?: string | null;
  created_at: string;
  paid_at: string | null;
  reviewed_at?: string | null;
  review_note?: string | null;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export interface Meal {
  id: string;
  log_date: string;
  meal_type: MealType;
  name: string;
  calories: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  created_at: string;
}

export interface InbodyReport {
  id: string;
  user_id: string;
  taken_at: string;
  mime_type: string;
  size_bytes: number;
  note: string | null;
  created_at: string;
}

export interface Vital {
  id: string;
  measured_at: string;
  weight_kg: number | null;
  systolic: number | null;
  diastolic: number | null;
  glucose: number | null;
  glucose_context: 'fasting' | 'post_meal' | 'random' | null;
  note: string | null;
  created_at: string;
}

export interface PlanMeal {
  name: string;
  items: string[];
  calories?: number;
}

export interface PlanContent {
  meals: PlanMeal[];
  guidelines: string[];
  avoid: string[];
}

export interface Plan {
  id: string;
  condition: ConditionId;
  title: string;
  target_calories: number;
  content: PlanContent;
  notes: string | null;
  status: 'draft' | 'published';
  published_at: string | null;
  created_at: string | null;
}

export interface Appointment {
  id: string;
  kind: AppointmentKind;
  status: AppointmentStatus;
  scheduled_at: string;
  meeting_link: string | null;
  patient_note: string | null;
  created_at: string;
}

export interface ClinicalNote {
  id: string;
  body: string;
  created_at: string;
}

export interface Question {
  id: string;
  body: string;
  answer: string | null;
  answered_at: string | null;
  created_at: string;
}

export interface QuestionWithPatient extends Question {
  user_id: string;
  patient: { id: string; name: string; condition: ConditionId | null } | null;
}

export interface ConditionInfo {
  id: ConditionId;
  label: string;
  short: string;
  description: string;
}

export interface PricingInfo {
  amount: number;
  label: string;
  note: string;
  days: number;
}

export interface PlanTemplate {
  condition: ConditionId;
  title: string;
  target_calories: number;
  summary: string;
  meals: PlanMeal[];
  guidelines: string[];
  avoid: string[];
}

export interface Catalog {
  conditions: ConditionInfo[];
  pricing: Record<PaymentKind, PricingInfo>;
  plans: PlanTemplate[];
}

export interface AdminSummary {
  patients: number;
  active_subscriptions: number;
  pending_appointments: number;
  upcoming_appointments: number;
  pending_activations: number;
  month_revenue: number;
  total_revenue: number;
  open_questions: number;
}

export interface PatientListItem extends User {
  subscription: Pick<Subscription, 'kind' | 'status' | 'ends_at' | 'amount'> | null;
  latest_weight: number | null;
  last_vital_at: string | null;
  last_meal_at: string | null;
}

export interface PatientDetail {
  patient: User;
  vitals: Vital[];
  meals: Meal[];
  notes: ClinicalNote[];
  questions: Question[];
  plan: Plan | null;
  plan_history: Plan[];
  appointments: Appointment[];
  payments: Payment[];
  subscription: Subscription | null;
  latest_subscription: Subscription | null;
}

export interface AppointmentWithPatient extends Appointment {
  user_id: string;
  patient: { id: string; name: string; phone: string | null; condition: ConditionId | null } | null;
}

export interface PaymentWithPatient extends Payment {
  user_id: string;
  patient: { id: string; name: string; phone?: string | null } | null;
}

export interface SessionPayload {
  user: User;
  subscription: Subscription | null;
}
