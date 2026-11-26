// Local API smoke + security test with real UTF-8 bodies. Not part of the deployed site.
const base = 'http://127.0.0.1:8000/functions/v1/app';

async function call(path, { method = 'GET', body, cookie, key } = {}) {
  const headers = { Accept: 'application/json' };
  if (body) headers['Content-Type'] = 'application/json';
  if (cookie) headers.Cookie = cookie;
  if (key) headers['Idempotency-Key'] = key;
  const response = await fetch(base + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const setCookie = response.headers.get('set-cookie');
  const json = await response.json();
  return { status: response.status, json, cookie: setCookie?.split(';')[0] ?? null, setCookie };
}

function assert(condition, label) {
  if (!condition) { console.error('FAIL:', label); process.exitCode = 1; }
  else console.log('ok:', label);
}

const stamp = Date.now();
const patientEmail = `mona${stamp}@example.com`;

const health = await call('/api/health');
assert(health.json.ok === true && health.json.dietitian_registration === true, 'health + dietitian code');

const reg = await call('/api/auth/register', {
  method: 'POST',
  body: { role: 'patient', name: 'منى أحمد', email: patientEmail, password: 'StrongPass123', phone: '01012345678', condition: 'obesity', gender: 'female', birth_year: 1988, height_cm: 165 },
});
assert(reg.status === 201 && reg.json.user.name === 'منى أحمد' && reg.cookie, 'patient registration with Arabic name');
assert(!('password_hash' in reg.json.user) && !('password_salt' in reg.json.user), 'registration response never exposes password hashes');
assert(/HttpOnly/i.test(reg.setCookie ?? '') && /SameSite=Lax/i.test(reg.setCookie ?? ''), 'session cookie is HttpOnly + SameSite=Lax');
assert(reg.json.user.activated_at === null, 'new patient starts unactivated');
const patientCookie = reg.cookie;
const patientId = reg.json.user.id;

const badJson = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"email":' });
assert(badJson.status === 400, 'invalid JSON returns 400 (not 500)');

const badCondition = await call('/api/auth/register', {
  method: 'POST',
  body: { role: 'patient', name: 'حالة خاطئة', email: `bad${stamp}@example.com`, password: 'StrongPass123', condition: 'cancer' },
});
assert(badCondition.status === 400 && badCondition.json.error === 'invalid_condition', 'unknown condition rejected with 400');

const wrongLogin = await call('/api/auth/login', { method: 'POST', body: { email: patientEmail, password: 'WrongPass123' } });
assert(wrongLogin.status === 401 && wrongLogin.json.error === 'invalid_credentials', 'wrong password rejected');

const me = await call('/api/auth/me', { cookie: patientCookie });
assert(me.status === 200 && me.json.user.email === patientEmail, 'session me');
assert(!('password_hash' in me.json.user), 'session response never exposes password hashes');

const pendingProfile = await call('/api/profile', { method: 'PATCH', cookie: patientCookie, body: { waist_cm: 96 } });
assert(pendingProfile.status === 403 && pendingProfile.json.error === 'activation_required', 'pending patient cannot edit profile');
const pendingMeals = await call('/api/meals', { cookie: patientCookie });
assert(pendingMeals.status === 403 && pendingMeals.json.error === 'activation_required', 'pending patient cannot read meals');
const pendingPlan = await call('/api/plans/current', { cookie: patientCookie });
assert(pendingPlan.status === 403 && pendingPlan.json.error === 'activation_required', 'pending patient cannot read plan');
const pendingAppts = await call('/api/appointments', { method: 'POST', cookie: patientCookie, body: { kind: 'monthly', scheduled_at: new Date(Date.now() + 3 * 86400000).toISOString() } });
assert(pendingAppts.status === 403, 'pending patient cannot book appointments');

const pendingBilling = await call('/api/billing', { cookie: patientCookie });
assert(pendingBilling.status === 200 && pendingBilling.json.payments.length === 0 && pendingBilling.json.subscription === null, 'pending patient can still open billing');

const dupRegister = await call('/api/auth/register', { method: 'POST', body: { role: 'patient', name: 'منى أحمد', email: patientEmail, password: 'StrongPass123', condition: 'obesity' } });
assert(dupRegister.status === 409, 'duplicate email rejected');

const patientAdmin = await call('/api/admin/summary', { cookie: patientCookie });
assert(patientAdmin.status === 403, 'patient cannot access admin routes');

const doctorUsername = `doctor${stamp}`;
const doc = await call('/api/auth/register', { method: 'POST', body: { role: 'dietitian', access_code: 'GHIZAI-DEV-2026', name: 'د. سارة', username: doctorUsername, password: 'DoctorPass123' } });
assert(doc.status === 201 && doc.json.user.role === 'dietitian', 'dietitian registration with code');
assert(doc.json.user.username === doctorUsername && !('email' in doc.json.user), 'dietitian registered by username, internal email hidden');
assert(Boolean(doc.json.user.activated_at), 'dietitian account is activated immediately');
const doctorCookie = doc.cookie;

const docLogin = await call('/api/auth/login', { method: 'POST', body: { identifier: doctorUsername, password: 'DoctorPass123' } });
assert(docLogin.status === 200 && docLogin.json.user.role === 'dietitian', 'dietitian logs in with username + password');
assert((await call('/api/auth/login', { method: 'POST', body: { identifier: doctorUsername, password: 'WrongPass123' } })).status === 401, 'wrong dietitian password rejected');

const dupUser = await call('/api/auth/register', { method: 'POST', body: { role: 'dietitian', access_code: 'GHIZAI-DEV-2026', name: 'د. مكرر', username: doctorUsername, password: 'DoctorPass123' } });
assert(dupUser.status === 409 && dupUser.json.error === 'username_taken', 'duplicate username rejected');
const badUsername = await call('/api/auth/register', { method: 'POST', body: { role: 'dietitian', access_code: 'GHIZAI-DEV-2026', name: 'د. رمز', username: 'a', password: 'DoctorPass123' } });
assert(badUsername.status === 400 && badUsername.json.error === 'invalid_username', 'short username rejected');

const patientLogin = await call('/api/auth/login', { method: 'POST', body: { email: patientEmail, password: 'StrongPass123' } });
assert(patientLogin.status === 200 && patientLogin.json.user.email === patientEmail, 'patient login by email still works');

const noCode = await call('/api/auth/register', { method: 'POST', body: { role: 'dietitian', access_code: 'WRONG', name: 'د. مجهول', username: `intruder${stamp}`, password: 'DoctorPass123' } });
assert(noCode.status === 403 && noCode.json.error === 'dietitian_code_invalid', 'dietitian registration requires correct code');

const badPhone = await call('/api/billing/proof', { method: 'POST', cookie: patientCookie, key: crypto.randomUUID(), body: { kind: 'monthly', sender_phone: '12345', reference: 'vodafone-778899' } });
assert(badPhone.status === 400 && badPhone.json.error === 'invalid_phone', 'invalid wallet sender phone rejected');
const badRef = await call('/api/billing/proof', { method: 'POST', cookie: patientCookie, key: crypto.randomUUID(), body: { kind: 'monthly', sender_phone: '01098765432', reference: 'abc' } });
assert(badRef.status === 400, 'invalid operation reference rejected');

const proofKey = crypto.randomUUID();
const proof = await call('/api/billing/proof', { method: 'POST', cookie: patientCookie, key: proofKey, body: { kind: 'monthly', sender_phone: '010 9876 5432', reference: 'vodafone-778899' } });
assert(proof.status === 201 && proof.json.payment.status === 'pending' && proof.json.payment.method === 'vodafone_cash', 'wallet transfer proof stored as pending');
assert(proof.json.payment.sender_phone === '01098765432' && proof.json.payment.reference === 'VODAFONE-778899', 'sender phone normalized and reference uppercased');
assert(proof.json.payment.amount === 500, 'proof amount taken from server-side pricing');
const proofAgain = await call('/api/billing/proof', { method: 'POST', cookie: patientCookie, key: proofKey, body: { kind: 'monthly', sender_phone: '01098765432', reference: 'vodafone-778899' } });
assert(proofAgain.status === 200 && proofAgain.json.payment.id === proof.json.payment.id, 'proof idempotency key returns same payment');
const paymentId = proof.json.payment.id;

const stillPendingMeals = await call('/api/meals', { cookie: patientCookie });
assert(stillPendingMeals.status === 403, 'submitting proof does not activate the account');

const notifications = await call('/api/admin/notifications', { cookie: doctorCookie });
assert(notifications.status === 200 && notifications.json.unread >= 1 && notifications.json.items.some((item) => item.type === 'payment_proof'), 'dietitian notified of new transfer');
const patientNotifications = await call('/api/admin/notifications', { cookie: patientCookie });
assert(patientNotifications.status === 403, 'patient cannot read dietitian notifications');
await call('/api/admin/notifications/read', { method: 'POST', cookie: doctorCookie });
const afterRead = await call('/api/admin/notifications', { cookie: doctorCookie });
assert(afterRead.json.unread === 0, 'notifications marked as read');

const patientConfirm = await call(`/api/admin/payments/${paymentId}/confirm`, { method: 'POST', cookie: patientCookie });
assert(patientConfirm.status === 403, 'patient cannot confirm own payment');
const unknownConfirm = await call(`/api/admin/payments/${crypto.randomUUID()}/confirm`, { method: 'POST', cookie: doctorCookie });
assert(unknownConfirm.status === 404, 'unknown payment returns 404');

const confirm = await call(`/api/admin/payments/${paymentId}/confirm`, { method: 'POST', cookie: doctorCookie });
assert(confirm.status === 200 && confirm.json.payment.status === 'paid' && confirm.json.subscription?.status === 'active', 'dietitian confirms transfer and creates subscription');
assert(Boolean(confirm.json.activated_at), 'confirmation sets activated_at');
const confirmAgain = await call(`/api/admin/payments/${paymentId}/confirm`, { method: 'POST', cookie: doctorCookie });
assert(confirmAgain.status === 409 && confirmAgain.json.error === 'payment_not_pending', 'already reviewed payment cannot be confirmed twice');

const activatedMe = await call('/api/auth/me', { cookie: patientCookie });
assert(Boolean(activatedMe.json.user.activated_at), 'patient session now shows activation');

const profile = await call('/api/profile', {
  method: 'PATCH', cookie: patientCookie,
  body: { waist_cm: 96, arm_cm: 31, conditions: ['obesity', 'hypertension'] },
});
assert(profile.status === 200 && profile.json.user.waist_cm === 96 && profile.json.user.arm_cm === 31, 'profile stores waist/arm');
assert(profile.json.user.conditions.includes('hypertension'), 'profile stores chronic conditions');

const invalidProfile = await call('/api/profile', { method: 'PATCH', cookie: patientCookie, body: { arm_cm: 500 } });
assert(invalidProfile.status === 400, 'out-of-range measurement rejected');

const meal = await call('/api/meals', { method: 'POST', cookie: patientCookie, body: { meal_type: 'lunch', name: 'أرز ودجاج', calories: 650, protein: 42 } });
assert(meal.status === 201 && meal.json.name === 'أرز ودجاج', 'add meal after activation');
const meals = await call(`/api/meals?date=${meal.json.log_date}`, { cookie: patientCookie });
assert(meals.json.length === 1 && meals.json[0].calories === 650, 'list meals by day');

const snackAm = await call('/api/meals', { method: 'POST', cookie: patientCookie, body: { meal_type: 'snack_am', name: 'تفاحة', calories: 90 } });
const snackPm = await call('/api/meals', { method: 'POST', cookie: patientCookie, body: { meal_type: 'snack_pm', name: 'زبادي', calories: 120 } });
assert(snackAm.status === 201 && snackPm.status === 201, 'both snack slots accepted');
const legacySnack = await call('/api/meals', { method: 'POST', cookie: patientCookie, body: { meal_type: 'snack', name: 'سناك قديم', calories: 100 } });
assert(legacySnack.status === 400, 'generic single snack slot rejected (3 meals + 2 snacks only)');

const vital = await call('/api/vitals', { method: 'POST', cookie: patientCookie, body: { weight_kg: 82, systolic: 148, diastolic: 92, glucose: 118, glucose_context: 'fasting' } });
assert(vital.status === 201 && vital.json.weight_kg === 82, 'add vitals');
const vitalList = await call('/api/vitals', { cookie: patientCookie });
assert(vitalList.json.length === 1, 'list vitals');

const inbodyImage = `data:image/jpeg;base64,${Buffer.from(new Uint8Array(600).fill(7)).toString('base64')}`;
const inbody = await call('/api/inbody', { method: 'POST', cookie: patientCookie, body: { image: inbodyImage, taken_at: '2026-11-26', note: 'قياس صباحي' } });
assert(inbody.status === 201 && inbody.json.size_bytes > 300, 'inbody photo upload');
const inbodyList = await call('/api/inbody', { cookie: patientCookie });
assert(inbodyList.json.length === 1 && !('image_base64' in inbodyList.json[0]), 'inbody list returns metadata only');
const inbodyRaw = await fetch(`${base}/api/inbody/${inbody.json.id}/image`, { headers: { Cookie: patientCookie } });
assert(inbodyRaw.status === 200 && inbodyRaw.headers.get('content-type') === 'image/jpeg', 'inbody image served as jpeg');
const badImage = await call('/api/inbody', { method: 'POST', cookie: patientCookie, body: { image: 'data:text/html;base64,AAAA' } });
assert(badImage.status === 400, 'non-image upload rejected');

const template = await call('/api/plans/current', { cookie: patientCookie });
assert(template.json.source === 'template' && template.json.reviewed === false, 'template plan fallback is unreviewed');
assert(template.json.plan.content.guidelines.some((line) => line.includes('الملح')), 'template merges hypertension comorbidity guidelines');

const appt = await call('/api/appointments', { method: 'POST', cookie: patientCookie, body: { kind: 'monthly', scheduled_at: new Date(Date.now() + 3 * 86400000).toISOString(), patient_note: 'متابعة أولى' } });
assert(appt.status === 201 && appt.json.status === 'requested', 'book appointment');

const question = await call('/api/questions', { method: 'POST', cookie: patientCookie, body: { body: 'هل أستبدل الأرز بالبرغل مع دواء الضغط؟' } });
assert(question.status === 201 && question.json.answer === null, 'patient posts question');

const summary = await call('/api/admin/summary', { cookie: doctorCookie });
assert(summary.json.patients >= 1 && summary.json.active_subscriptions >= 1 && summary.json.open_questions >= 1, 'admin summary');
assert(summary.json.pending_activations === 0, 'no pending activations after confirmation');

const patients = await call('/api/admin/patients?q=منى', { cookie: doctorCookie });
assert(patients.json.some((row) => row.id === patientId && Array.isArray(row.conditions)), 'admin patient search');

const draft = await call(`/api/admin/patients/${patientId}/plan`, {
  method: 'POST', cookie: doctorCookie,
  body: { title: 'خطة منى الغذائية', target_calories: 1600, notes: 'قللي الملح والكافيين' },
});
assert(draft.status === 201 && draft.json.plan.status === 'draft', 'dietitian saves plan as draft');
assert(draft.json.plan.content.guidelines.some((line) => line.includes('الملح')), 'draft plan merges patient comorbidities');
const draftId = draft.json.plan.id;

const stillHidden = await call('/api/plans/current', { cookie: patientCookie });
assert(stillHidden.json.source === 'template' && stillHidden.json.awaiting_review === true, 'patient still cannot read unreviewed draft');
assert(!stillHidden.json.plan.title.includes('منى'), 'draft title is not leaked to patient');

const patientPublish = await call(`/api/admin/patients/${patientId}/plans/${draftId}/publish`, { method: 'POST', cookie: patientCookie });
assert(patientPublish.status === 403, 'patient cannot publish plans');

const published = await call(`/api/admin/patients/${patientId}/plans/${draftId}/publish`, { method: 'POST', cookie: doctorCookie });
assert(published.status === 200 && published.json.plan.status === 'published', 'dietitian publishes plan');

const afterPlan = await call('/api/plans/current', { cookie: patientCookie });
assert(afterPlan.json.source === 'assigned' && afterPlan.json.reviewed === true && afterPlan.json.plan.target_calories === 1600, 'patient sees approved plan only');

const note = await call(`/api/admin/patients/${patientId}/notes`, { method: 'POST', cookie: doctorCookie, body: { body: 'التزام جيد بالمتابعة' } });
assert(note.status === 201, 'add clinical note');

const openQuestions = await call('/api/admin/questions?status=open', { cookie: doctorCookie });
assert(openQuestions.json.some((item) => item.id === question.json.id && item.patient?.name === 'منى أحمد'), 'admin sees open question with patient');

const patientAnswerAdmin = await call(`/api/admin/questions/${question.json.id}`, { method: 'PATCH', cookie: patientCookie, body: { answer: 'محاولة' } });
assert(patientAnswerAdmin.status === 403, 'patient cannot answer questions as dietitian');

const beforeAnswer = await call('/api/admin/summary', { cookie: doctorCookie });
const answered = await call(`/api/admin/questions/${question.json.id}`, { method: 'PATCH', cookie: doctorCookie, body: { answer: 'نعم يمكن الاستبدال مع متابعة الضغط.' } });
assert(answered.status === 200 && answered.json.answer, 'dietitian answers question');
const patientQuestions = await call('/api/questions', { cookie: patientCookie });
assert(patientQuestions.json[0].answer === 'نعم يمكن الاستبدال مع متابعة الضغط.', 'patient sees dietitian answer');

const afterAnswerSummary = await call('/api/admin/summary', { cookie: doctorCookie });
assert(afterAnswerSummary.json.open_questions === beforeAnswer.json.open_questions - 1, 'open questions count updates after answer');

const adminAppts = await call('/api/admin/appointments', { cookie: doctorCookie });
const target = adminAppts.json.find((item) => item.id === appt.json.id);
assert(target?.patient?.name === 'منى أحمد', 'admin appointment with patient name');

const badLink = await call(`/api/admin/appointments/${appt.json.id}`, { method: 'PATCH', cookie: doctorCookie, body: { status: 'confirmed', meeting_link: 'http://insecure.example.com' } });
assert(badLink.status === 400, 'non-https meeting link rejected');

const confirmed = await call(`/api/admin/appointments/${appt.json.id}`, { method: 'PATCH', cookie: doctorCookie, body: { status: 'confirmed', meeting_link: 'https://meet.example.com/room' } });
assert(confirmed.status === 200 && confirmed.json.status === 'confirmed', 'confirm appointment with https link');

const payments = await call('/api/admin/payments', { cookie: doctorCookie });
assert(payments.json.total >= 500 && payments.json.payments.length >= 1, 'admin payments totals only confirmed transfers');
const pendingList = await call('/api/admin/payments?status=pending', { cookie: doctorCookie });
assert(pendingList.json.payments.length === 0, 'no pending transfers after confirmation');

const secondProof = await call('/api/billing/proof', { method: 'POST', cookie: patientCookie, key: crypto.randomUUID(), body: { kind: 'consultation', sender_phone: '01098765432', reference: 'vodafone-112233' } });
assert(secondProof.status === 201 && secondProof.json.payment.amount === 150, 'second proof accepted');
const reject = await call(`/api/admin/payments/${secondProof.json.payment.id}/reject`, { method: 'POST', cookie: doctorCookie, body: { note: 'لم يصل مبلغ التحويل.' } });
assert(reject.status === 200 && reject.json.payment.status === 'rejected' && reject.json.payment.review_note.includes('التحويل'), 'dietitian rejects transfer with note');
const billingAfterReject = await call('/api/billing', { cookie: patientCookie });
assert(billingAfterReject.json.payments.some((payment) => payment.status === 'rejected' && payment.review_note), 'patient sees rejection reason in billing');
const rejectAgain = await call(`/api/admin/payments/${secondProof.json.payment.id}/reject`, { method: 'POST', cookie: doctorCookie, body: {} });
assert(rejectAgain.status === 409, 'rejected payment cannot be reviewed again');

const manual = await call(`/api/admin/patients/${patientId}/activate`, { method: 'POST', cookie: doctorCookie, body: { kind: 'quarter' } });
assert(manual.status === 201 && manual.json.subscription?.kind === 'quarter', 'dietitian activates subscription manually');

const detail = await call(`/api/admin/patients/${patientId}`, { cookie: doctorCookie });
assert(detail.json.patient.id === patientId && detail.json.plan?.status === 'published', 'admin patient detail');
assert(detail.json.questions.length >= 1 && detail.json.patient.waist_cm === 96, 'admin detail includes questions + measurements');

const adminInbody = await call(`/api/admin/patients/${patientId}/inbody`, { cookie: doctorCookie });
assert(adminInbody.json.length === 1 && adminInbody.json[0].id === inbody.json.id, 'dietitian sees patient inbody photos');
const patientAdminInbody = await call(`/api/admin/patients/${patientId}/inbody`, { cookie: patientCookie });
assert(patientAdminInbody.status === 403, 'patient cannot list admin inbody endpoint');
const dietitianPhoto = await fetch(`${base}/api/inbody/${inbody.json.id}/image`, { headers: { Cookie: doctorCookie } });
assert(dietitianPhoto.status === 200, 'dietitian can view patient inbody image');

const missing = await call(`/api/admin/patients/${crypto.randomUUID()}`, { cookie: doctorCookie });
assert(missing.status === 404, 'unknown patient returns 404');

const logout = await call('/api/auth/logout', { method: 'POST', cookie: patientCookie });
assert(logout.status === 200 && logout.setCookie?.includes('Max-Age=0'), 'logout clears cookie');

const afterLogout = await call('/api/auth/me', { cookie: patientCookie });
assert(afterLogout.status === 401, 'revoked session rejected');

console.log(process.exitCode ? 'SMOKE TEST FAILED' : 'SMOKE TEST PASSED');
