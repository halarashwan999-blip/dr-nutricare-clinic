import { AppError, applicationPath, errorJson, isSecureRequest, json, readJson, requireTrustedWrite, rows } from './http.mjs';
import {
  clearSessionCookie, consume, createSession, hashPassword, revokeSession,
  sessionCookie, SESSION_TTL_MS, validateSession, verifyPassword, verifyPasswordAgainstDummy,
} from './auth.mjs';
import {
  CONDITION_IDS, CONDITIONS, defaultTargetCalories, PAYMENT_KINDS, PLAN_TEMPLATES, planForProfile, PRICING,
} from './templates.mjs';

const SESSION_TTL_SECONDS = Math.floor(SESSION_TTL_MS / 1000);
const USER_COLUMNS = 'id,role,email,username,name,phone,condition,gender,birth_year,height_cm,target_weight,target_calories,waist_cm,arm_cm,conditions,activated_at,created_at';
const PAYMENT_COLUMNS = 'id,kind,amount,method,status,reference,sender_phone,created_at,paid_at,reviewed_at,review_note';
const MEAL_TYPES = ['breakfast', 'snack_am', 'lunch', 'snack_pm', 'dinner'];
const APPOINTMENT_KINDS = ['consultation', 'monthly', 'plan_review'];
const APPOINTMENT_STATUSES = ['requested', 'confirmed', 'completed', 'cancelled'];
const WALLET_PHONE_RE = /^01[0125][0-9]{8}$/;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,31}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

const fail = (code, status = 400) => { throw new AppError(code, status); };
const isUuid = (value) => typeof value === 'string' && UUID_RE.test(value);

function appEnv(name) {
  try {
    const value = globalThis.Deno?.env?.get(name);
    if (value != null) return value;
  } catch { /* not running under Deno */ }
  try { return globalThis.process?.env?.[name] ?? null; } catch { return null; }
}

function readEmail(value) {
  if (typeof value !== 'string') fail('invalid_email');
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !EMAIL_RE.test(email)) fail('invalid_email');
  return email;
}

function readUsername(value) {
  if (typeof value !== 'string') fail('invalid_username');
  const username = value.trim().toLowerCase();
  if (!USERNAME_RE.test(username)) fail('invalid_username');
  return username;
}

function readIdentifier(value) {
  if (typeof value !== 'string') return null;
  const text = value.trim().toLowerCase();
  if (text.includes('@')) return EMAIL_RE.test(text) ? text : null;
  return USERNAME_RE.test(text) ? text : null;
}

function readName(value) {
  if (typeof value !== 'string') fail('invalid_input');
  const name = value.trim().replace(/\s+/g, ' ');
  if (name.length < 2 || name.length > 80) fail('invalid_input');
  return name;
}

function readPassword(value) {
  if (typeof value !== 'string' || value.length < 8 || value.length > 200) fail('weak_password');
  return value;
}

function readPhone(value) {
  if (value == null || value === '') return null;
  if (typeof value !== 'string') fail('invalid_input');
  const phone = value.trim();
  if (!/^[0-9+\-\s]{6,20}$/.test(phone)) fail('invalid_phone');
  return phone;
}

function readWalletPhone(value) {
  if (typeof value !== 'string') fail('invalid_phone');
  const phone = value.replace(/[\s-]/g, '');
  if (!WALLET_PHONE_RE.test(phone)) fail('invalid_phone');
  return phone;
}

function readPaymentReference(value) {
  if (typeof value !== 'string') fail('invalid_input');
  const reference = value.trim().toUpperCase();
  if (!/^[A-Z0-9-]{4,40}$/.test(reference)) fail('invalid_input');
  return reference;
}

function readCondition(value) {
  if (typeof value !== 'string' || !CONDITION_IDS.includes(value)) fail('invalid_condition');
  return value;
}

function readConditions(value) {
  if (!Array.isArray(value) || value.length > 6) fail('invalid_input');
  const ids = [...new Set(value)];
  if (!ids.every((id) => typeof id === 'string' && CONDITION_IDS.includes(id))) fail('invalid_condition');
  return ids;
}

function clientUser(row) {
  let conditions = row?.conditions;
  if (typeof conditions === 'string') {
    try { conditions = JSON.parse(conditions); } catch { conditions = []; }
  }
  const user = {
    ...row,
    conditions: Array.isArray(conditions) ? conditions.filter((id) => CONDITION_IDS.includes(id)) : [],
  };
  delete user.password_salt;
  delete user.password_hash;
  delete user.password_iterations;
  if (user.role === 'dietitian' && typeof user.email === 'string' && user.email.endsWith('@dietitian.ghizai')) delete user.email;
  return user;
}

function readGender(value) {
  if (value == null || value === '') return null;
  if (value !== 'male' && value !== 'female') fail('invalid_input');
  return value;
}

function readInt(value, min, max, { nullable = true } = {}) {
  if (value == null || value === '') {
    if (nullable) return null;
    fail('invalid_input');
  }
  if (!Number.isInteger(value) || value < min || value > max) fail('invalid_input');
  return value;
}

function readText(value, min, max, { nullable = false } = {}) {
  if (value == null || value === '') {
    if (nullable) return null;
    fail('invalid_input');
  }
  if (typeof value !== 'string') fail('invalid_input');
  const text = value.trim();
  if (text.length < min || text.length > max) fail('invalid_input');
  return text;
}

function readDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) fail('invalid_input');
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) fail('invalid_input');
  return value;
}

function readDateTime(value, { futureMinutes = -1, futureDays = 400 } = {}) {
  if (typeof value !== 'string') fail('invalid_date');
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) fail('invalid_date');
  const now = Date.now();
  if (parsed.getTime() < now - futureMinutes * 60000) fail('invalid_date');
  if (parsed.getTime() > now + futureDays * DAY_MS) fail('invalid_date');
  return parsed.toISOString();
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function activeSubscription(subscriptions, now = Date.now()) {
  const active = subscriptions
    .filter((sub) => sub.status === 'active' && Date.parse(sub.ends_at) > now)
    .sort((a, b) => Date.parse(b.ends_at) - Date.parse(a.ends_at));
  return active[0] ?? null;
}

function readPlanContent(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('invalid_input');
  const meals = Array.isArray(value.meals) ? value.meals : [];
  if (meals.length < 1 || meals.length > 12) fail('invalid_input');
  const safeMeals = meals.map((meal) => {
    if (!meal || typeof meal !== 'object') fail('invalid_input');
    const items = Array.isArray(meal.items) ? meal.items : [];
    if (items.length > 15) fail('invalid_input');
    return {
      name: readText(meal.name, 1, 60),
      items: items.map((item) => readText(item, 1, 140)),
      calories: readInt(meal.calories, 0, 3000, { nullable: false }),
    };
  });
  const readList = (list) => {
    if (list == null) return [];
    if (!Array.isArray(list) || list.length > 12) fail('invalid_input');
    return list.map((item) => readText(item, 1, 220));
  };
  return { meals: safeMeals, guidelines: readList(value.guidelines), avoid: readList(value.avoid) };
}

function planFromTemplate(condition, conditions = []) {
  const template = planForProfile(condition, conditions);
  return {
    id: `template-${template.condition}`,
    condition: template.condition,
    title: template.title,
    target_calories: template.target_calories,
    content: { meals: template.meals, guidelines: template.guidelines, avoid: template.avoid },
    notes: null,
    status: 'draft',
    published_at: null,
    created_at: null,
  };
}

function normalizePlan(row) {
  let content = row.content;
  if (typeof content === 'string') {
    try { content = JSON.parse(content); } catch { content = { meals: [], guidelines: [], avoid: [] }; }
  }
  if (!content || typeof content !== 'object') content = { meals: [], guidelines: [], avoid: [] };
  return {
    id: row.id,
    condition: row.condition,
    title: row.title,
    target_calories: row.target_calories,
    content: {
      meals: Array.isArray(content.meals) ? content.meals : [],
      guidelines: Array.isArray(content.guidelines) ? content.guidelines : [],
      avoid: Array.isArray(content.avoid) ? content.avoid : [],
    },
    notes: row.notes ?? null,
    status: row.status ?? (row.published_at ? 'published' : 'draft'),
    published_at: row.published_at ?? null,
    created_at: row.created_at ?? null,
  };
}

export function application({ db }) {
  async function requireUserRow(request) {
    const result = await validateSession(db, request);
    if (result.state !== 'valid') fail('login_required', 401);
    const found = rows(await db.from('users').select(USER_COLUMNS).eq('id', result.session.userId).limit(1));
    if (found.length !== 1) fail('login_required', 401);
    return found[0];
  }

  async function requireDietitian(request) {
    const user = await requireUserRow(request);
    if (user.role !== 'dietitian') fail('forbidden', 403);
    return user;
  }

  function requireActivated(user) {
    if (user.role === 'patient' && !user.activated_at) fail('activation_required', 403);
    return user;
  }

  async function notifyDietitians({ type, title, body, link }) {
    const dietitians = rows(await db.from('users').select('id').eq('role', 'dietitian').limit(20));
    const now = new Date().toISOString();
    for (const dietitian of dietitians) {
      await db.from('notifications').insert({
        id: crypto.randomUUID(),
        user_id: dietitian.id,
        type,
        title,
        body,
        link,
        read_at: null,
        created_at: now,
      });
    }
  }

  async function loadSubscriptions(userId) {
    const all = rows(await db.from('subscriptions')
      .select('id,user_id,kind,starts_at,ends_at,amount,status,payment_id,created_at')
      .eq('user_id', userId).order('ends_at', { ascending: false }).limit(30));
    return { active: activeSubscription(all), latest: all[0] ?? null };
  }

  async function register(request) {
    const body = await readJson(request);
    const role = body?.role === 'dietitian' ? 'dietitian' : 'patient';

    if (role === 'dietitian') {
      const expected = appEnv('APP_DIETITIAN_CODE');
      if (!expected) fail('dietitian_registration_disabled', 403);
      if (typeof body.access_code !== 'string' || body.access_code !== expected) fail('dietitian_code_invalid', 403);
    }

    const username = role === 'dietitian' ? readUsername(body?.username) : null;
    const email = role === 'dietitian' ? `${username}@dietitian.ghizai` : readEmail(body?.email);
    const name = readName(body?.name);
    const password = readPassword(body?.password);
    const phone = readPhone(body?.phone);
    const condition = role === 'patient' ? readCondition(body?.condition) : null;
    const gender = readGender(body?.gender);
    const birthYear = readInt(body?.birth_year, 1920, new Date().getUTCFullYear() - 10);
    const heightCm = readInt(body?.height_cm, 110, 230);

    const limit = await consume(db, 'register', username ?? email);
    if (!limit.allowed) return json({ error: 'rate_limited' }, 429, { 'retry-after': '3600' });

    const existing = username
      ? rows(await db.from('users').select('id').eq('username', username).limit(1))
      : rows(await db.from('users').select('id').eq('email', email).limit(1));
    if (existing.length > 0) return errorJson(username ? 'username_taken' : 'email_taken', 409);

    const derived = await hashPassword(password);
    const id = crypto.randomUUID();
    const inserted = rows(await db.from('users').insertIfAbsent({
      id,
      role,
      email,
      username,
      name,
      phone,
      condition,
      gender,
      birth_year: birthYear,
      height_cm: heightCm,
      target_weight: null,
      target_calories: condition ? defaultTargetCalories(condition) : null,
      conditions: condition ? [condition] : [],
      activated_at: role === 'dietitian' ? new Date().toISOString() : null,
      password_salt: derived.salt,
      password_hash: derived.hash,
      password_iterations: derived.iterations,
      created_at: new Date().toISOString(),
    }, { onConflict: 'email' }).select(USER_COLUMNS));

    if (inserted.length !== 1) {
      const winner = username
        ? rows(await db.from('users').select('id').eq('username', username).limit(1))
        : rows(await db.from('users').select('id').eq('email', email).limit(1));
      if (winner.length === 1) return errorJson(username ? 'username_taken' : 'email_taken', 409);
      return errorJson('registration_unconfirmed', 503);
    }

    const session = await createSession(db, id);
    const secure = isSecureRequest(request);
    return json({
      user: clientUser(inserted[0]),
      subscription: null,
    }, 201, { 'set-cookie': sessionCookie(session.token, SESSION_TTL_SECONDS, secure) });
  }

  async function login(request) {
    const body = await readJson(request);
    const identifier = readIdentifier(body?.identifier ?? body?.email);
    const password = typeof body?.password === 'string' ? body.password : '';
    if (!identifier) {
      await verifyPasswordAgainstDummy(password);
      return errorJson('invalid_credentials', 401);
    }

    const limit = await consume(db, 'login', identifier);
    if (!limit.allowed) return json({ error: 'rate_limited' }, 429, { 'retry-after': '900' });

    const found = rows(await db.from('users')
      .select(`${USER_COLUMNS},password_salt,password_hash,password_iterations`)
      .eq(identifier.includes('@') ? 'email' : 'username', identifier).limit(1));

    if (found.length !== 1) {
      await verifyPasswordAgainstDummy(password);
      return errorJson('invalid_credentials', 401);
    }

    const row = found[0];
    const ok = await verifyPassword(password, {
      salt: row.password_salt, hash: row.password_hash, iterations: row.password_iterations,
    });
    if (!ok) return errorJson('invalid_credentials', 401);

    const session = await createSession(db, row.id);
    const subs = await loadSubscriptions(row.id);
    const secure = isSecureRequest(request);
    return json({ user: clientUser(row), subscription: subs.active }, 200, {
      'set-cookie': sessionCookie(session.token, SESSION_TTL_SECONDS, secure),
    });
  }

  async function logout(request) {
    const result = await validateSession(db, request);
    if (result.state === 'valid' && result.session) {
      try { await revokeSession(db, result.session.digest); }
      catch { return errorJson('logout_unconfirmed', 503); }
    }
    return json({ ok: true }, 200, { 'set-cookie': clearSessionCookie(isSecureRequest(request)) });
  }

  async function me(request) {
    const user = await requireUserRow(request);
    const subs = await loadSubscriptions(user.id);
    return json({ user: clientUser(user), subscription: subs.active });
  }

  async function updateProfile(request, user) {
    const body = await readJson(request);
    const patch = {};
    if (body?.name !== undefined) patch.name = readName(body.name);
    if (body?.phone !== undefined) patch.phone = readPhone(body.phone);
    if (body?.condition !== undefined) {
      if (user.role !== 'patient') fail('invalid_input');
      patch.condition = readCondition(body.condition);
    }
    if (body?.gender !== undefined) patch.gender = readGender(body.gender);
    if (body?.birth_year !== undefined) patch.birth_year = readInt(body.birth_year, 1920, new Date().getUTCFullYear() - 10);
    if (body?.height_cm !== undefined) patch.height_cm = readInt(body.height_cm, 110, 230);
    if (body?.target_weight !== undefined) patch.target_weight = readInt(body.target_weight, 25, 350);
    if (body?.target_calories !== undefined) patch.target_calories = readInt(body.target_calories, 800, 5000);
    if (body?.waist_cm !== undefined) patch.waist_cm = readInt(body.waist_cm, 40, 250);
    if (body?.arm_cm !== undefined) patch.arm_cm = readInt(body.arm_cm, 15, 80);
    if (body?.conditions !== undefined) {
      if (user.role !== 'patient') fail('invalid_input');
      patch.conditions = readConditions(body.conditions);
    }
    if (Object.keys(patch).length === 0) fail('invalid_input');

    const updated = rows(await db.from('users').update(patch).eq('id', user.id).select(USER_COLUMNS));
    if (updated.length !== 1) fail('not_found', 404);
    return json({ user: clientUser(updated[0]) });
  }

  async function changePassword(request, user) {
    const body = await readJson(request);
    const current = typeof body?.current_password === 'string' ? body.current_password : '';
    const next = readPassword(body?.new_password);
    const found = rows(await db.from('users')
      .select('password_salt,password_hash,password_iterations').eq('id', user.id).limit(1));
    if (found.length !== 1) fail('not_found', 404);
    const ok = await verifyPassword(current, {
      salt: found[0].password_salt, hash: found[0].password_hash, iterations: found[0].password_iterations,
    });
    if (!ok) return errorJson('invalid_credentials', 401);
    const derived = await hashPassword(next);
    const updated = rows(await db.from('users').update({
      password_salt: derived.salt,
      password_hash: derived.hash,
      password_iterations: derived.iterations,
    }).eq('id', user.id).select('id'));
    if (updated.length !== 1) fail('password_unconfirmed', 503);
    return json({ ok: true });
  }

  function mealRow(body) {
    return {
      id: crypto.randomUUID(),
      user_id: '',
      log_date: body?.log_date ? readDate(body.log_date) : todayIso(),
      meal_type: MEAL_TYPES.includes(body?.meal_type) ? body.meal_type : fail('invalid_input'),
      name: readText(body?.name, 1, 100),
      calories: readInt(body?.calories, 0, 5000, { nullable: false }),
      protein: readInt(body?.protein, 0, 500),
      carbs: readInt(body?.carbs, 0, 500),
      fat: readInt(body?.fat, 0, 500),
      created_at: new Date().toISOString(),
    };
  }

  async function listMeals(request, user) {
    const url = new URL(request.url);
    const date = url.searchParams.get('date');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    if (date) {
      return json(rows(await db.from('meal_logs')
        .select('id,log_date,meal_type,name,calories,protein,carbs,fat,created_at')
        .eq('user_id', user.id).eq('log_date', readDate(date))
        .order('created_at', { ascending: true }).limit(100)));
    }
    if (from && to) {
      const start = readDate(from);
      const end = readDate(to);
      if (Date.parse(end) - Date.parse(start) > 31 * DAY_MS) fail('invalid_input');
      return json(rows(await db.from('meal_logs')
        .select('id,log_date,meal_type,name,calories,protein,carbs,fat,created_at')
        .eq('user_id', user.id).gte('log_date', start).lte('log_date', end)
        .order('log_date', { ascending: true }).limit(400)));
    }
    return json(rows(await db.from('meal_logs')
      .select('id,log_date,meal_type,name,calories,protein,carbs,fat,created_at')
      .eq('user_id', user.id).order('created_at', { ascending: false }).limit(100)));
  }

  async function addMeal(request, user) {
    const body = await readJson(request);
    const row = mealRow(body);
    row.user_id = user.id;
    const inserted = rows(await db.from('meal_logs').insert(row)
      .select('id,log_date,meal_type,name,calories,protein,carbs,fat,created_at'));
    if (inserted.length !== 1) fail('write_unconfirmed', 503);
    return json(inserted[0], 201);
  }

  async function deleteMeal(id, user) {
    const deleted = rows(await db.from('meal_logs').delete()
      .eq('id', id).eq('user_id', user.id).select('id'));
    if (deleted.length !== 1) fail('not_found', 404);
    return json({ ok: true });
  }

  async function listVitals(request, user) {
    const url = new URL(request.url);
    const limit = readInt(Number(url.searchParams.get('limit') ?? 30), 1, 100, { nullable: false });
    return json(rows(await db.from('vitals')
      .select('id,measured_at,weight_kg,systolic,diastolic,glucose,glucose_context,note,created_at')
      .eq('user_id', user.id).order('measured_at', { ascending: false }).limit(limit)));
  }

  async function addVital(request, user) {
    const body = await readJson(request);
    const weight = readInt(body?.weight_kg, 20, 350);
    const systolic = readInt(body?.systolic, 60, 260);
    const diastolic = readInt(body?.diastolic, 30, 200);
    const glucose = readInt(body?.glucose, 20, 800);
    if (weight == null && systolic == null && glucose == null) fail('invalid_input');
    if ((systolic == null) !== (diastolic == null)) fail('invalid_input');
    if (systolic != null && diastolic != null && diastolic >= systolic) fail('invalid_input');
    const context = body?.glucose_context == null ? null
      : (['fasting', 'post_meal', 'random'].includes(body.glucose_context) ? body.glucose_context : fail('invalid_input'));

    const row = {
      id: crypto.randomUUID(),
      user_id: user.id,
      measured_at: body?.measured_at ? readDateTime(body.measured_at, { futureMinutes: 10 }) : new Date().toISOString(),
      weight_kg: weight,
      systolic,
      diastolic,
      glucose,
      glucose_context: context,
      note: readText(body?.note, 1, 300, { nullable: true }),
      created_at: new Date().toISOString(),
    };
    const inserted = rows(await db.from('vitals').insert(row)
      .select('id,measured_at,weight_kg,systolic,diastolic,glucose,glucose_context,note,created_at'));
    if (inserted.length !== 1) fail('write_unconfirmed', 503);
    return json(inserted[0], 201);
  }

  async function deleteVital(id, user) {
    const deleted = rows(await db.from('vitals').delete()
      .eq('id', id).eq('user_id', user.id).select('id'));
    if (deleted.length !== 1) fail('not_found', 404);
    return json({ ok: true });
  }

  const INBODY_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  const INBODY_MAX_BASE64 = 850_000;
  const INBODY_KEEP = 12;
  const INBODY_COLUMNS = 'id,user_id,taken_at,mime_type,size_bytes,note,created_at';

  async function listInbody(user) {
    return json(rows(await db.from('inbody_reports')
      .select(INBODY_COLUMNS)
      .eq('user_id', user.id).order('created_at', { ascending: false }).limit(50)));
  }

  async function uploadInbody(request, user) {
    const body = await readJson(request, 900_000);
    const image = typeof body?.image === 'string' ? body.image : '';
    const match = image.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
    if (!match) fail('invalid_image');
    const [, mimeType, base64] = match;
    if (!INBODY_TYPES.includes(mimeType)) fail('invalid_image');
    if (base64.length > INBODY_MAX_BASE64) fail('image_too_large', 413);
    const sizeBytes = Math.floor((base64.length * 3) / 4) - (base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0);
    if (sizeBytes < 200) fail('invalid_image');

    const row = {
      id: crypto.randomUUID(),
      user_id: user.id,
      taken_at: body?.taken_at ? readDate(body.taken_at) : todayIso(),
      mime_type: mimeType,
      size_bytes: sizeBytes,
      image_base64: base64,
      note: readText(body?.note, 1, 300, { nullable: true }),
      created_at: new Date().toISOString(),
    };
    const inserted = rows(await db.from('inbody_reports').insert(row).select(INBODY_COLUMNS));
    if (inserted.length !== 1) fail('write_unconfirmed', 503);

    const existing = rows(await db.from('inbody_reports').select('id')
      .eq('user_id', user.id).order('created_at', { ascending: false }).limit(200));
    for (const extra of existing.slice(INBODY_KEEP)) {
      await db.from('inbody_reports').delete().eq('id', extra.id);
    }
    return json(inserted[0], 201);
  }

  async function inbodyImage(id, user) {
    const found = rows(await db.from('inbody_reports')
      .select('user_id,mime_type,image_base64').eq('id', id).limit(1));
    if (found.length !== 1) fail('not_found', 404);
    if (user.role !== 'dietitian' && found[0].user_id !== user.id) fail('forbidden', 403);
    let binary;
    try {
      binary = Uint8Array.from(atob(found[0].image_base64), (char) => char.charCodeAt(0));
    } catch {
      fail('invalid_image', 500);
    }
    return new Response(binary, {
      headers: {
        'content-type': found[0].mime_type,
        'content-length': String(binary.length),
        'cache-control': 'private, max-age=300',
        'x-content-type-options': 'nosniff',
        'referrer-policy': 'no-referrer',
        'content-disposition': 'inline',
      },
    });
  }

  async function deleteInbody(id, user) {
    const deleted = rows(await db.from('inbody_reports').delete()
      .eq('id', id).eq('user_id', user.id).select('id'));
    if (deleted.length !== 1) fail('not_found', 404);
    return json({ ok: true });
  }

  async function adminPatientInbody(patientId, request) {
    await requireDietitian(request);
    return json(rows(await db.from('inbody_reports')
      .select(INBODY_COLUMNS)
      .eq('user_id', patientId).order('created_at', { ascending: false }).limit(50)));
  }

  async function currentPlan(user) {
    const found = rows(await db.from('plans')
      .select('id,condition,title,target_calories,content,notes,active,status,published_at,created_at')
      .eq('user_id', user.id).order('created_at', { ascending: false }).limit(20));
    const published = found.find((plan) => plan.active === true && plan.status === 'published');
    if (published) {
      return json({ plan: normalizePlan(published), source: 'assigned', reviewed: true });
    }
    const pending = found.find((plan) => plan.status !== 'published');
    const conditions = Array.isArray(user.conditions) ? user.conditions : [];
    return json({
      plan: planFromTemplate(user.condition ?? 'obesity', conditions),
      source: 'template',
      reviewed: false,
      awaiting_review: Boolean(pending),
    });
  }

  async function listAppointments(user) {
    return json(rows(await db.from('appointments')
      .select('id,kind,status,scheduled_at,meeting_link,patient_note,created_at')
      .eq('user_id', user.id).order('scheduled_at', { ascending: false }).limit(50)));
  }

  async function addAppointment(request, user) {
    const body = await readJson(request);
    const kind = APPOINTMENT_KINDS.includes(body?.kind) ? body.kind : 'monthly';
    const scheduledAt = readDateTime(body?.scheduled_at, { futureMinutes: -30, futureDays: 180 });
    const row = {
      id: crypto.randomUUID(),
      user_id: user.id,
      kind,
      status: 'requested',
      scheduled_at: scheduledAt,
      meeting_link: null,
      patient_note: readText(body?.patient_note, 1, 500, { nullable: true }),
      created_at: new Date().toISOString(),
    };
    const inserted = rows(await db.from('appointments').insert(row)
      .select('id,kind,status,scheduled_at,meeting_link,patient_note,created_at'));
    if (inserted.length !== 1) fail('write_unconfirmed', 503);
    return json(inserted[0], 201);
  }

  async function billing(request, user) {
    const payments = rows(await db.from('payments')
      .select(PAYMENT_COLUMNS)
      .eq('user_id', user.id).order('created_at', { ascending: false }).limit(50));
    const subs = await loadSubscriptions(user.id);
    return json({ payments, subscription: subs.active, latest_subscription: subs.latest, pricing: PRICING });
  }

  async function ensureSubscription(user, payment) {
    if (payment.kind === 'consultation') return null;
    const existing = rows(await db.from('subscriptions').select('id')
      .eq('payment_id', payment.id).limit(1));
    if (existing.length > 0) return existing[0];

    const subs = await loadSubscriptions(user.id);
    const startMs = subs.active ? Date.parse(subs.active.ends_at) : Date.now();
    const days = PRICING[payment.kind]?.days ?? 30;
    const row = {
      id: crypto.randomUUID(),
      user_id: user.id,
      kind: payment.kind,
      starts_at: new Date(startMs).toISOString(),
      ends_at: new Date(startMs + days * DAY_MS).toISOString(),
      amount: payment.amount,
      status: 'active',
      payment_id: payment.id,
      created_at: new Date().toISOString(),
    };
    const inserted = rows(await db.from('subscriptions').insert(row)
      .select('id,user_id,kind,starts_at,ends_at,amount,status,payment_id,created_at'));
    if (inserted.length !== 1) fail('subscription_unconfirmed', 503);
    return inserted[0];
  }

  async function submitPaymentProof(request, user) {
    const body = await readJson(request);
    const kind = PAYMENT_KINDS.includes(body?.kind) ? body.kind : fail('invalid_input');
    const senderPhone = readWalletPhone(body?.sender_phone);
    const reference = readPaymentReference(body?.reference);
    const keyHeader = request.headers.get('idempotency-key');
    if (keyHeader != null && !isUuid(keyHeader)) fail('invalid_input');
    const key = keyHeader ?? crypto.randomUUID();
    const now = new Date().toISOString();

    const payment = {
      id: crypto.randomUUID(),
      user_id: user.id,
      kind,
      amount: PRICING[kind].amount,
      method: 'vodafone_cash',
      status: 'pending',
      reference,
      sender_phone: senderPhone,
      idempotency_key: key,
      created_at: now,
      paid_at: null,
      reviewed_by: null,
      reviewed_at: null,
      review_note: null,
    };

    const inserted = rows(await db.from('payments').insertIfAbsent(payment, { onConflict: 'user_id,idempotency_key' })
      .select(PAYMENT_COLUMNS));
    let stored = inserted[0];
    let created = true;
    if (!stored) {
      const existing = rows(await db.from('payments')
        .select(PAYMENT_COLUMNS)
        .eq('user_id', user.id).eq('idempotency_key', key).limit(1));
      if (existing.length !== 1) fail('payment_unconfirmed', 503);
      stored = existing[0];
      created = false;
    }

    if (created) {
      await notifyDietitians({
        type: 'payment_proof',
        title: `تحويل جديد بانتظار التأكيد — ${user.name}`,
        body: `${PRICING[kind].label} · ${PRICING[kind].amount} ج.م · من محفظة ${senderPhone} · رقم العملية ${reference}`,
        link: '/clinic/activations',
      });
    }

    return json({
      payment: stored,
      message: created
        ? 'تم إرسال إثبات التحويل. سيُفعّل حسابك بعد التأكد من التحويل من قبل د. هالة.'
        : 'طلب التحويل مسجل بالفعل وهو قيد المراجعة.',
    }, created ? 201 : 200);
  }

  async function adminConfirmPayment(id, request, dietitian) {
    if (!isUuid(id)) fail('not_found', 404);
    const found = rows(await db.from('payments').select(`id,user_id,${PAYMENT_COLUMNS}`).eq('id', id).limit(1));
    if (found.length !== 1) fail('not_found', 404);
    if (found[0].status !== 'pending') fail('payment_not_pending', 409);
    const now = new Date().toISOString();
    const updated = rows(await db.from('payments').update({
      status: 'paid',
      paid_at: now,
      reviewed_by: dietitian.id,
      reviewed_at: now,
    }).eq('id', id).eq('status', 'pending').select(PAYMENT_COLUMNS));
    if (updated.length !== 1) fail('payment_not_pending', 409);

    const subscription = await ensureSubscription({ id: found[0].user_id }, updated[0]);

    const patients = rows(await db.from('users').select('id,activated_at').eq('id', found[0].user_id).limit(1));
    let activatedAt = patients[0]?.activated_at ?? null;
    if (!activatedAt) {
      activatedAt = now;
      rows(await db.from('users').update({ activated_at: activatedAt }).eq('id', found[0].user_id).select('id'));
    }

    return json({
      payment: updated[0],
      subscription: subscription ?? null,
      activated_at: activatedAt,
      message: 'تم تأكيد التحويل وتفعيل الحساب.',
    });
  }

  async function adminRejectPayment(id, request, dietitian) {
    if (!isUuid(id)) fail('not_found', 404);
    const body = await readJson(request);
    const note = readText(body?.note, 1, 300, { nullable: true });
    const updated = rows(await db.from('payments').update({
      status: 'rejected',
      reviewed_by: dietitian.id,
      reviewed_at: new Date().toISOString(),
      review_note: note,
    }).eq('id', id).eq('status', 'pending').select(PAYMENT_COLUMNS));
    if (updated.length !== 1) fail('payment_not_pending', 409);
    return json({ payment: updated[0], message: 'تم رفض التحويل، ولم يُفعّل الحساب.' });
  }

  async function adminNotifications(request) {
    const dietitian = await requireDietitian(request);
    const items = rows(await db.from('notifications')
      .select('id,type,title,body,link,read_at,created_at')
      .eq('user_id', dietitian.id).order('created_at', { ascending: false }).limit(50));
    return json({ items, unread: items.filter((item) => !item.read_at).length });
  }

  async function adminReadNotifications(request) {
    const dietitian = await requireDietitian(request);
    rows(await db.from('notifications').update({ read_at: new Date().toISOString() })
      .eq('user_id', dietitian.id).select('id'));
    return json({ ok: true });
  }

  async function adminSummary(request) {
    await requireDietitian(request);
    const patients = rows(await db.from('users').select('id,condition,created_at')
      .eq('role', 'patient').limit(300));
    const subscriptions = rows(await db.from('subscriptions')
      .select('user_id,status,ends_at,amount').limit(500));
    const appointments = rows(await db.from('appointments')
      .select('status,scheduled_at').limit(500));
    const payments = rows(await db.from('payments')
      .select('amount,status,created_at').limit(500));
    const questions = rows(await db.from('questions')
      .select('id,answer').limit(500));
    const now = Date.now();
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const activeUserIds = new Set(subscriptions
      .filter((sub) => sub.status === 'active' && Date.parse(sub.ends_at) > now)
      .map((sub) => sub.user_id));
    const paid = payments.filter((payment) => payment.status === 'paid');
    return json({
      patients: patients.length,
      active_subscriptions: activeUserIds.size,
      pending_appointments: appointments.filter((item) => item.status === 'requested').length,
      upcoming_appointments: appointments.filter((item) => ['requested', 'confirmed'].includes(item.status)).length,
      pending_activations: payments.filter((payment) => payment.status === 'pending').length,
      month_revenue: paid.filter((payment) => Date.parse(payment.created_at) >= monthStart.getTime())
        .reduce((sum, payment) => sum + payment.amount, 0),
      total_revenue: paid.reduce((sum, payment) => sum + payment.amount, 0),
      open_questions: questions.filter((question) => !question.answer).length,
    });
  }

  async function adminPatients(request) {
    await requireDietitian(request);
    const q = (new URL(request.url).searchParams.get('q') ?? '').trim().toLowerCase().slice(0, 60);
    const patients = rows(await db.from('users').select(USER_COLUMNS)
      .eq('role', 'patient').order('created_at', { ascending: false }).limit(100));
    const subscriptions = rows(await db.from('subscriptions')
      .select('user_id,kind,status,ends_at,amount').limit(500));
    const vitals = rows(await db.from('vitals')
      .select('user_id,weight_kg,measured_at').order('measured_at', { ascending: false }).limit(500));
    const meals = rows(await db.from('meal_logs')
      .select('user_id,created_at').order('created_at', { ascending: false }).limit(500));
    const now = Date.now();
    const subByUser = new Map();
    for (const sub of subscriptions) {
      const current = subByUser.get(sub.user_id);
      if (!current || Date.parse(sub.ends_at) > Date.parse(current.ends_at)) subByUser.set(sub.user_id, sub);
    }
    const vitalByUser = new Map();
    for (const vital of vitals) if (!vitalByUser.has(vital.user_id)) vitalByUser.set(vital.user_id, vital);
    const mealByUser = new Map();
    for (const meal of meals) if (!mealByUser.has(meal.user_id)) mealByUser.set(meal.user_id, meal);

    const result = patients
      .filter((patient) => !q
        || patient.name.toLowerCase().includes(q)
        || patient.email.toLowerCase().includes(q)
        || (patient.phone ?? '').includes(q))
      .map((patient) => {
        const sub = subByUser.get(patient.id) ?? null;
        const vital = vitalByUser.get(patient.id) ?? null;
        const meal = mealByUser.get(patient.id) ?? null;
        return {
          ...clientUser(patient),
          subscription: sub && sub.status === 'active' && Date.parse(sub.ends_at) > now ? sub : null,
          latest_weight: vital?.weight_kg ?? null,
          last_vital_at: vital?.measured_at ?? null,
          last_meal_at: meal?.created_at ?? null,
        };
      });
    return json(result);
  }

  async function adminPatientDetail(id, request) {
    await requireDietitian(request);
    if (!isUuid(id)) fail('not_found', 404);
    const found = rows(await db.from('users').select(USER_COLUMNS).eq('id', id).limit(1));
    if (found.length !== 1 || found[0].role !== 'patient') fail('not_found', 404);
    const patient = clientUser(found[0]);
    const vitals = rows(await db.from('vitals')
      .select('id,measured_at,weight_kg,systolic,diastolic,glucose,glucose_context,note,created_at')
      .eq('user_id', id).order('measured_at', { ascending: false }).limit(60));
    const fromDate = new Date(Date.now() - 13 * DAY_MS).toISOString().slice(0, 10);
    const meals = rows(await db.from('meal_logs')
      .select('id,log_date,meal_type,name,calories,protein,carbs,fat,created_at')
      .eq('user_id', id).gte('log_date', fromDate)
      .order('log_date', { ascending: false }).limit(300));
    const notes = rows(await db.from('notes')
      .select('id,body,created_at').eq('user_id', id)
      .order('created_at', { ascending: false }).limit(100));
    const questions = rows(await db.from('questions')
      .select('id,body,answer,answered_at,created_at').eq('user_id', id)
      .order('created_at', { ascending: false }).limit(50));
    const plans = rows(await db.from('plans')
      .select('id,condition,title,target_calories,content,notes,active,status,published_at,created_at')
      .eq('user_id', id).order('created_at', { ascending: false }).limit(10));
    const appointments = rows(await db.from('appointments')
      .select('id,kind,status,scheduled_at,meeting_link,patient_note,created_at')
      .eq('user_id', id).order('scheduled_at', { ascending: false }).limit(50));
    const payments = rows(await db.from('payments')
      .select(PAYMENT_COLUMNS)
      .eq('user_id', id).order('created_at', { ascending: false }).limit(50));
    const subs = await loadSubscriptions(id);
    const activePlans = plans.filter((plan) => plan.active === true);
    return json({
      patient,
      vitals,
      meals,
      notes,
      questions,
      plan: activePlans.length ? normalizePlan(activePlans[0]) : (plans.length ? normalizePlan(plans[0]) : null),
      plan_history: plans.map(normalizePlan),
      appointments,
      payments,
      subscription: subs.active,
      latest_subscription: subs.latest,
    });
  }

  async function adminAddNote(id, request, dietitian) {
    await adminPatientExists(id);
    const body = await readJson(request);
    const row = {
      id: crypto.randomUUID(),
      user_id: id,
      dietitian_id: dietitian.id,
      body: readText(body?.body, 3, 2000),
      created_at: new Date().toISOString(),
    };
    const inserted = rows(await db.from('notes').insert(row).select('id,body,created_at'));
    if (inserted.length !== 1) fail('write_unconfirmed', 503);
    return json(inserted[0], 201);
  }

  async function adminPatientExists(id) {
    if (!isUuid(id)) fail('not_found', 404);
    const found = rows(await db.from('users').select('id,role').eq('id', id).limit(1));
    if (found.length !== 1 || found[0].role !== 'patient') fail('not_found', 404);
    return found[0];
  }

  async function adminAssignPlan(id, request, dietitian) {
    const patient = rows(await db.from('users').select('id,role,condition,conditions').eq('id', id).limit(1));
    if (patient.length !== 1 || patient[0].role !== 'patient') fail('not_found', 404);
    const body = await readJson(request);
    const condition = patient[0].condition ?? 'obesity';
    const patientConditions = Array.isArray(patient[0].conditions) ? patient[0].conditions : [];
    const prepared = planForProfile(condition, patientConditions);
    const title = readText(body?.title, 3, 80);
    const targetCalories = readInt(body?.target_calories, 800, 5000, { nullable: false });
    let content;
    if (body?.content != null) content = readPlanContent(body.content);
    else {
      content = {
        meals: prepared.meals,
        guidelines: prepared.guidelines,
        avoid: prepared.avoid,
      };
    }
    const notes = readText(body?.notes, 1, 2000, { nullable: true });

    const row = {
      id: crypto.randomUUID(),
      user_id: id,
      dietitian_id: dietitian.id,
      condition,
      title,
      target_calories: targetCalories,
      content,
      notes,
      active: true,
      status: 'draft',
      published_at: null,
      created_at: new Date().toISOString(),
    };
    const inserted = rows(await db.from('plans').insert(row)
      .select('id,condition,title,target_calories,content,notes,active,status,published_at,created_at'));
    if (inserted.length !== 1) fail('write_unconfirmed', 503);
    return json({ plan: normalizePlan(inserted[0]), message: 'تم حفظ الخطة كمسودة. لن تظهر للمريض حتى تعتمدها.' }, 201);
  }

  async function adminPublishPlan(patientId, planId, request) {
    await requireDietitian(request);
    if (!isUuid(patientId) || !isUuid(planId)) fail('not_found', 404);
    const found = rows(await db.from('plans').select('id,user_id,status')
      .eq('id', planId).eq('user_id', patientId).limit(1));
    if (found.length !== 1) fail('not_found', 404);
    rows(await db.from('plans').update({ active: false })
      .eq('user_id', patientId).eq('active', true).select('id'));
    const updated = rows(await db.from('plans').update({
      status: 'published',
      published_at: new Date().toISOString(),
      active: true,
    }).eq('id', planId)
      .select('id,condition,title,target_calories,content,notes,active,status,published_at,created_at'));
    if (updated.length !== 1) fail('write_unconfirmed', 503);
    return json({ plan: normalizePlan(updated[0]), message: 'تم اعتماد الخطة وإرسالها لحساب المريض.' });
  }

  async function listQuestions(user) {
    return json(rows(await db.from('questions')
      .select('id,body,answer,answered_at,created_at').eq('user_id', user.id)
      .order('created_at', { ascending: false }).limit(50)));
  }

  async function addQuestion(request, user) {
    const body = await readJson(request);
    const row = {
      id: crypto.randomUUID(),
      user_id: user.id,
      body: readText(body?.body, 3, 2000),
      answer: null,
      answered_by: null,
      answered_at: null,
      created_at: new Date().toISOString(),
    };
    const inserted = rows(await db.from('questions').insert(row)
      .select('id,body,answer,answered_at,created_at'));
    if (inserted.length !== 1) fail('write_unconfirmed', 503);
    return json(inserted[0], 201);
  }

  async function adminQuestions(request) {
    await requireDietitian(request);
    const status = new URL(request.url).searchParams.get('status');
    let list = rows(await db.from('questions')
      .select('id,user_id,body,answer,answered_at,created_at')
      .order('created_at', { ascending: false }).limit(200));
    if (status === 'open') list = list.filter((item) => !item.answer);
    if (status === 'answered') list = list.filter((item) => Boolean(item.answer));
    const patients = rows(await db.from('users').select('id,name,condition').eq('role', 'patient').limit(300));
    const byId = new Map(patients.map((patient) => [patient.id, patient]));
    return json(list.map((item) => ({ ...item, patient: byId.get(item.user_id) ?? null })));
  }

  async function adminAnswerQuestion(id, request, dietitian) {
    if (!isUuid(id)) fail('not_found', 404);
    const body = await readJson(request);
    const answer = readText(body?.answer, 2, 2000);
    const updated = rows(await db.from('questions').update({
      answer,
      answered_by: dietitian.id,
      answered_at: new Date().toISOString(),
    }).eq('id', id).select('id,user_id,body,answer,answered_at,created_at'));
    if (updated.length !== 1) fail('not_found', 404);
    return json(updated[0]);
  }

  async function adminActivate(id, request, dietitian) {
    const patient = rows(await db.from('users').select('id,role').eq('id', id).limit(1));
    if (patient.length !== 1 || patient[0].role !== 'patient') fail('not_found', 404);
    const body = await readJson(request);
    const kind = body?.kind === 'quarter' ? 'quarter' : (body?.kind === 'monthly' ? 'monthly' : fail('invalid_input'));
    const payment = {
      id: crypto.randomUUID(),
      user_id: id,
      kind,
      amount: 0,
      method: 'manual',
      status: 'paid',
      reference: `MANUAL-${Date.now().toString(36).toUpperCase()}`,
      idempotency_key: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      paid_at: new Date().toISOString(),
    };
    const inserted = rows(await db.from('payments').insertIfAbsent(payment, { onConflict: 'user_id,idempotency_key' })
      .select('id,kind,amount,method,status,reference,created_at,paid_at'));
    if (inserted.length !== 1) fail('write_unconfirmed', 503);
    const subscription = await ensureSubscription({ id }, inserted[0]);
    const patients = rows(await db.from('users').select('id,activated_at').eq('id', id).limit(1));
    let activatedAt = patients[0]?.activated_at ?? null;
    if (!activatedAt) {
      activatedAt = new Date().toISOString();
      rows(await db.from('users').update({ activated_at: activatedAt }).eq('id', id).select('id'));
    }
    return json({ payment: inserted[0], subscription, activated_at: activatedAt }, 201);
  }

  async function adminAppointments(request) {
    await requireDietitian(request);
    const status = new URL(request.url).searchParams.get('status');
    let list;
    if (status && APPOINTMENT_STATUSES.includes(status)) {
      list = rows(await db.from('appointments')
        .select('id,user_id,kind,status,scheduled_at,meeting_link,patient_note,created_at')
        .eq('status', status).order('scheduled_at', { ascending: true }).limit(100));
    } else {
      list = rows(await db.from('appointments')
        .select('id,user_id,kind,status,scheduled_at,meeting_link,patient_note,created_at')
        .order('scheduled_at', { ascending: false }).limit(100));
    }
    const patients = rows(await db.from('users').select('id,name,phone,condition')
      .eq('role', 'patient').limit(300));
    const byId = new Map(patients.map((patient) => [patient.id, patient]));
    return json(list.map((item) => ({ ...item, patient: byId.get(item.user_id) ?? null })));
  }

  async function adminUpdateAppointment(id, request) {
    await requireDietitian(request);
    if (!isUuid(id)) fail('not_found', 404);
    const body = await readJson(request);
    if (!APPOINTMENT_STATUSES.includes(body?.status)) fail('invalid_input');
    const patch = { status: body.status };
    if (body?.meeting_link != null && body.meeting_link !== '') {
      const link = readText(body.meeting_link, 8, 500);
      if (!/^https:\/\//.test(link)) fail('invalid_input');
      patch.meeting_link = link;
    }
    const updated = rows(await db.from('appointments').update(patch).eq('id', id)
      .select('id,user_id,kind,status,scheduled_at,meeting_link,patient_note,created_at'));
    if (updated.length !== 1) fail('not_found', 404);
    return json(updated[0]);
  }

  async function adminPayments(request) {
    await requireDietitian(request);
    const status = new URL(request.url).searchParams.get('status');
    let list = rows(await db.from('payments')
      .select(`id,user_id,${PAYMENT_COLUMNS}`)
      .order('created_at', { ascending: false }).limit(200));
    if (status === 'pending' || status === 'paid' || status === 'rejected') {
      list = list.filter((payment) => payment.status === status);
    }
    const patients = rows(await db.from('users').select('id,name,phone')
      .eq('role', 'patient').limit(300));
    const byId = new Map(patients.map((patient) => [patient.id, patient]));
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const paid = list.filter((payment) => payment.status === 'paid');
    return json({
      payments: list.map((payment) => ({ ...payment, patient: byId.get(payment.user_id) ?? null })),
      total: paid.reduce((sum, payment) => sum + payment.amount, 0),
      month: paid.filter((payment) => Date.parse(payment.created_at) >= monthStart.getTime())
        .reduce((sum, payment) => sum + payment.amount, 0),
    });
  }

  async function dispatch(request) {
      requireTrustedWrite(request);
      const path = applicationPath(request);
      const method = request.method;

      if (path === '/api/health' && method === 'GET') {
        return json({ ok: true, service: 'ghizai', dietitian_registration: Boolean(appEnv('APP_DIETITIAN_CODE')) });
      }
      if (path === '/api/catalog' && method === 'GET') {
        return json({ conditions: CONDITIONS, pricing: PRICING, plans: PLAN_TEMPLATES });
      }
      if (path === '/api/auth/register' && method === 'POST') return register(request);
      if (path === '/api/auth/login' && method === 'POST') return login(request);
      if (path === '/api/auth/logout' && method === 'POST') return logout(request);

      if (path === '/api/auth/me' && method === 'GET') return me(request);
      if (path === '/api/profile' && method === 'PATCH') return updateProfile(request, requireActivated(await requireUserRow(request)));
      if (path === '/api/auth/password' && method === 'POST') return changePassword(request, await requireUserRow(request));

      if (path === '/api/meals' && method === 'GET') return listMeals(request, requireActivated(await requireUserRow(request)));
      if (path === '/api/meals' && method === 'POST') return addMeal(request, requireActivated(await requireUserRow(request)));
      const meal = path.match(/^\/api\/meals\/([0-9a-f-]{36})$/);
      if (meal && isUuid(meal[1]) && method === 'DELETE') return deleteMeal(meal[1], requireActivated(await requireUserRow(request)));

      if (path === '/api/vitals' && method === 'GET') return listVitals(request, requireActivated(await requireUserRow(request)));
      if (path === '/api/vitals' && method === 'POST') return addVital(request, requireActivated(await requireUserRow(request)));
      const vital = path.match(/^\/api\/vitals\/([0-9a-f-]{36})$/);
      if (vital && isUuid(vital[1]) && method === 'DELETE') return deleteVital(vital[1], requireActivated(await requireUserRow(request)));

      if (path === '/api/inbody' && method === 'GET') return listInbody(requireActivated(await requireUserRow(request)));
      if (path === '/api/inbody' && method === 'POST') return uploadInbody(request, requireActivated(await requireUserRow(request)));
      const inbodyImagePath = path.match(/^\/api\/inbody\/([0-9a-f-]{36})\/image$/);
      if (inbodyImagePath && isUuid(inbodyImagePath[1]) && method === 'GET') {
        return inbodyImage(inbodyImagePath[1], requireActivated(await requireUserRow(request)));
      }
      const inbodyPath = path.match(/^\/api\/inbody\/([0-9a-f-]{36})$/);
      if (inbodyPath && isUuid(inbodyPath[1]) && method === 'DELETE') {
        return deleteInbody(inbodyPath[1], requireActivated(await requireUserRow(request)));
      }

      if (path === '/api/plans/current' && method === 'GET') return currentPlan(requireActivated(await requireUserRow(request)));
      if (path === '/api/questions' && method === 'GET') return listQuestions(requireActivated(await requireUserRow(request)));
      if (path === '/api/questions' && method === 'POST') return addQuestion(request, requireActivated(await requireUserRow(request)));
      if (path === '/api/appointments' && method === 'GET') return listAppointments(requireActivated(await requireUserRow(request)));
      if (path === '/api/appointments' && method === 'POST') return addAppointment(request, requireActivated(await requireUserRow(request)));
      if (path === '/api/billing' && method === 'GET') return billing(request, await requireUserRow(request));
      if (path === '/api/billing/proof' && method === 'POST') return submitPaymentProof(request, await requireUserRow(request));

      if (path === '/api/admin/summary' && method === 'GET') return adminSummary(request);
      if (path === '/api/admin/patients' && method === 'GET') return adminPatients(request);
      const adminPatient = path.match(/^\/api\/admin\/patients\/([0-9a-f-]{36})$/);
      if (adminPatient && isUuid(adminPatient[1]) && method === 'GET') return adminPatientDetail(adminPatient[1], request);
      const adminNote = path.match(/^\/api\/admin\/patients\/([0-9a-f-]{36})\/notes$/);
      if (adminNote && isUuid(adminNote[1]) && method === 'POST') {
        const dietitian = await requireDietitian(request);
        return adminAddNote(adminNote[1], request, dietitian);
      }
      const adminPlan = path.match(/^\/api\/admin\/patients\/([0-9a-f-]{36})\/plan$/);
      if (adminPlan && isUuid(adminPlan[1]) && method === 'POST') {
        const dietitian = await requireDietitian(request);
        return adminAssignPlan(adminPlan[1], request, dietitian);
      }
      const adminPublish = path.match(/^\/api\/admin\/patients\/([0-9a-f-]{36})\/plans\/([0-9a-f-]{36})\/publish$/);
      if (adminPublish && isUuid(adminPublish[1]) && isUuid(adminPublish[2]) && method === 'POST') {
        return adminPublishPlan(adminPublish[1], adminPublish[2], request);
      }
      const adminActivatePath = path.match(/^\/api\/admin\/patients\/([0-9a-f-]{36})\/activate$/);
      if (adminActivatePath && isUuid(adminActivatePath[1]) && method === 'POST') {
        const dietitian = await requireDietitian(request);
        return adminActivate(adminActivatePath[1], request, dietitian);
      }
      const adminInbodyPath = path.match(/^\/api\/admin\/patients\/([0-9a-f-]{36})\/inbody$/);
      if (adminInbodyPath && isUuid(adminInbodyPath[1]) && method === 'GET') {
        return adminPatientInbody(adminInbodyPath[1], request);
      }
      if (path === '/api/admin/questions' && method === 'GET') return adminQuestions(request);
      const adminQuestion = path.match(/^\/api\/admin\/questions\/([0-9a-f-]{36})$/);
      if (adminQuestion && isUuid(adminQuestion[1]) && method === 'PATCH') {
        const dietitian = await requireDietitian(request);
        return adminAnswerQuestion(adminQuestion[1], request, dietitian);
      }
      if (path === '/api/admin/appointments' && method === 'GET') return adminAppointments(request);
      const adminAppointment = path.match(/^\/api\/admin\/appointments\/([0-9a-f-]{36})$/);
      if (adminAppointment && isUuid(adminAppointment[1]) && method === 'PATCH') {
        return adminUpdateAppointment(adminAppointment[1], request);
      }
      if (path === '/api/admin/payments' && method === 'GET') return adminPayments(request);
      const adminPaymentAction = path.match(/^\/api\/admin\/payments\/([0-9a-f-]{36})\/(confirm|reject)$/);
      if (adminPaymentAction && isUuid(adminPaymentAction[1]) && method === 'POST') {
        const dietitian = await requireDietitian(request);
        return adminPaymentAction[2] === 'confirm'
          ? adminConfirmPayment(adminPaymentAction[1], request, dietitian)
          : adminRejectPayment(adminPaymentAction[1], request, dietitian);
      }
      if (path === '/api/admin/notifications' && method === 'GET') return adminNotifications(request);
      if (path === '/api/admin/notifications/read' && method === 'POST') return adminReadNotifications(request);

      return errorJson('not_found', 404);
  }

  return async function handle(request) {
    try {
      // Awaiting keeps route rejections inside this error boundary.
      return await dispatch(request);
    } catch (error) {
      if (error instanceof AppError) return errorJson(error.code, error.status);
      return errorJson('service_unavailable', 503);
    }
  };
}
