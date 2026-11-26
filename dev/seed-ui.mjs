// Scratch seed for a local UI walkthrough. Not deployed.
const base = 'http://127.0.0.1:8000/functions/v1/app';

async function call(path, { method = 'GET', body, cookie, key } = {}) {
  const headers = { Accept: 'application/json' };
  if (body) headers['Content-Type'] = 'application/json';
  if (cookie) headers.Cookie = cookie;
  if (key) headers['Idempotency-Key'] = key;
  const res = await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const setCookie = res.headers.get('set-cookie');
  return { status: res.status, json: await res.json(), cookie: setCookie?.split(';')[0] ?? null };
}

const stamp = Date.now();
const patientEmail = `sara${stamp}@example.com`;
const pendingEmail = `noor${stamp}@example.com`;
const doctorUsername = `hala.rashwan${stamp}`;

const doc = await call('/api/auth/register', { method: 'POST', body: { role: 'dietitian', access_code: 'GHIZAI-DEV-2026', name: 'هالة رشوان', username: doctorUsername, password: 'DoctorPass123' } });

const reg = await call('/api/auth/register', {
  method: 'POST',
  body: { role: 'patient', name: 'سارة محمود', email: patientEmail, password: 'StrongPass123', phone: '01122334455', condition: 'obesity', gender: 'female', birth_year: 1990, height_cm: 164 },
});
const cookie = reg.cookie;
const id = reg.json.user.id;

const proof = await call('/api/billing/proof', {
  method: 'POST', cookie, key: crypto.randomUUID(),
  body: { kind: 'monthly', sender_phone: '01122334455', reference: 'vodafone-556677' },
});
const confirmed = await call(`/api/admin/payments/${proof.json.payment.id}/confirm`, { method: 'POST', cookie: doc.cookie });

await call('/api/profile', { method: 'PATCH', cookie, body: { waist_cm: 98, arm_cm: 32, conditions: ['obesity', 'hypertension', 'diabetes'] } });
await call('/api/vitals', { method: 'POST', cookie, body: { weight_kg: 88, systolic: 146, diastolic: 92, glucose: 132, glucose_context: 'fasting' } });
await call('/api/meals', { method: 'POST', cookie, body: { meal_type: 'breakfast', name: 'فول وبيض', calories: 380 } });
await call('/api/meals', { method: 'POST', cookie, body: { meal_type: 'snack_am', name: 'تفاحة ولوز', calories: 140 } });
await call('/api/meals', { method: 'POST', cookie, body: { meal_type: 'lunch', name: 'دجاج وأرز', calories: 700 } });
await call('/api/meals', { method: 'POST', cookie, body: { meal_type: 'snack_pm', name: 'زبادي يوناني', calories: 120 } });
await call('/api/meals', { method: 'POST', cookie, body: { meal_type: 'dinner', name: 'سمك مشوي وخضار', calories: 330 } });
await call('/api/appointments', { method: 'POST', cookie, body: { kind: 'consultation', scheduled_at: new Date(Date.now() + 2 * 86400000).toISOString(), patient_note: 'أشعر بالجوع الشديد مساءً' } });
await call('/api/questions', { method: 'POST', cookie, body: { body: 'هل أزيد البروتين في الفطار مع دواء الضغط؟' } });

await call(`/api/admin/patients/${id}/plan`, { method: 'POST', cookie: doc.cookie, body: { title: 'خطة سارة لخسارة الوزن مع الضغط والسكر', target_calories: 1600, notes: 'تقليل الملح إلى أقل من 5 جم و3 ملاعق أرز فقط في الغداء.' } });

const pending = await call('/api/auth/register', {
  method: 'POST',
  body: { role: 'patient', name: 'نور حسن', email: pendingEmail, password: 'StrongPass123', phone: '01233445566', condition: 'diabetes', gender: 'female', birth_year: 1985, height_cm: 160 },
});
const pendingProof = await call('/api/billing/proof', {
  method: 'POST', cookie: pending.cookie, key: crypto.randomUUID(),
  body: { kind: 'quarter', sender_phone: '01233445566', reference: 'vodafone-998877' },
});

console.log(JSON.stringify({
  patientEmail,
  doctorUsername,
  doctorPassword: 'DoctorPass123',
  activated: confirmed.status === 200,
  pendingActivation: { email: pendingEmail, payment: pendingProof.json.payment?.status },
}, null, 2));
