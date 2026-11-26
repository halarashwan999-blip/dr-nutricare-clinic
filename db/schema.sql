CREATE TABLE app.users (
  id uuid PRIMARY KEY,
  role text NOT NULL,
  email text NOT NULL UNIQUE,
  username text,
  name text NOT NULL,
  phone text,
  condition text,
  gender text,
  birth_year integer,
  height_cm integer,
  target_weight integer,
  target_calories integer,
  waist_cm integer,
  arm_cm integer,
  conditions jsonb,
  activated_at timestamptz,
  password_salt text NOT NULL,
  password_hash text NOT NULL,
  password_iterations integer NOT NULL,
  created_at timestamptz NOT NULL
);
CREATE TABLE app.sessions (
  token_digest text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app.users (id),
  created_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz
);
CREATE TABLE app.auth_limiter (
  key text PRIMARY KEY,
  window_started_at timestamptz NOT NULL,
  attempt_count integer NOT NULL
);
CREATE TABLE app.meal_logs (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app.users (id),
  log_date text NOT NULL,
  meal_type text NOT NULL,
  name text NOT NULL,
  calories integer NOT NULL,
  protein integer,
  carbs integer,
  fat integer,
  created_at timestamptz NOT NULL
);
CREATE TABLE app.vitals (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app.users (id),
  measured_at timestamptz NOT NULL,
  weight_kg integer,
  systolic integer,
  diastolic integer,
  glucose integer,
  glucose_context text,
  note text,
  created_at timestamptz NOT NULL
);
CREATE TABLE app.plans (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app.users (id),
  dietitian_id uuid NOT NULL,
  condition text NOT NULL,
  title text NOT NULL,
  target_calories integer NOT NULL,
  content jsonb NOT NULL,
  notes text,
  active boolean NOT NULL,
  status text,
  published_at timestamptz,
  created_at timestamptz NOT NULL
);
CREATE TABLE app.appointments (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app.users (id),
  kind text NOT NULL,
  status text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  meeting_link text,
  patient_note text,
  created_at timestamptz NOT NULL
);
CREATE TABLE app.subscriptions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app.users (id),
  kind text NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  amount integer NOT NULL,
  status text NOT NULL,
  payment_id uuid NOT NULL,
  created_at timestamptz NOT NULL
);
CREATE TABLE app.payments (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app.users (id),
  kind text NOT NULL,
  amount integer NOT NULL,
  method text NOT NULL,
  status text NOT NULL,
  reference text NOT NULL,
  sender_phone text,
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL,
  paid_at timestamptz,
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_note text,
  UNIQUE (user_id, idempotency_key)
);
CREATE TABLE app.notifications (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app.users (id),
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL
);
CREATE TABLE app.notes (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app.users (id),
  dietitian_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL
);
CREATE TABLE app.questions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app.users (id),
  body text NOT NULL,
  answer text,
  answered_by uuid,
  answered_at timestamptz,
  created_at timestamptz NOT NULL
);
CREATE TABLE app.inbody_reports (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app.users (id),
  taken_at text NOT NULL,
  mime_type text NOT NULL,
  size_bytes integer NOT NULL,
  image_base64 text NOT NULL,
  note text,
  created_at timestamptz NOT NULL
);
CREATE INDEX sessions_user_idx ON app.sessions (user_id);
CREATE INDEX meal_logs_user_date_idx ON app.meal_logs (user_id, log_date);
CREATE INDEX vitals_user_measured_idx ON app.vitals (user_id, measured_at);
CREATE INDEX plans_user_created_idx ON app.plans (user_id, created_at);
CREATE INDEX appointments_user_scheduled_idx ON app.appointments (user_id, scheduled_at);
CREATE INDEX subscriptions_user_ends_idx ON app.subscriptions (user_id, ends_at);
CREATE INDEX payments_user_created_idx ON app.payments (user_id, created_at);
CREATE INDEX payments_status_created_idx ON app.payments (status, created_at);
CREATE INDEX notifications_user_created_idx ON app.notifications (user_id, created_at);
CREATE INDEX notes_user_created_idx ON app.notes (user_id, created_at);
CREATE INDEX questions_user_created_idx ON app.questions (user_id, created_at);
CREATE INDEX inbody_reports_user_created_idx ON app.inbody_reports (user_id, created_at);
CREATE UNIQUE INDEX users_username_idx ON app.users (username) WHERE username IS NOT NULL;
