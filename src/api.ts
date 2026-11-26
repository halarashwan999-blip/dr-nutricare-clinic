const messages: Record<string, string> = {
  invalid_credentials: 'اسم المستخدم أو البريد الإلكتروني أو كلمة المرور غير صحيحة.',
  email_taken: 'هذا البريد الإلكتروني مسجل بالفعل. جرّب تسجيل الدخول.',
  invalid_username: 'اسم المستخدم غير صحيح. استخدم 3 إلى 32 حرفًا إنجليزيًا أو أرقامًا (a-z، 0-9، . _ -).',
  username_taken: 'اسم المستخدم محجوز بالفعل. اختر اسمًا آخر.',
  weak_password: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل.',
  invalid_email: 'أدخل بريدًا إلكترونيًا صحيحًا.',
  invalid_phone: 'رقم الهاتف غير صحيح.',
  invalid_condition: 'اختر الحالة الصحية.',
  rate_limited: 'محاولات كثيرة. انتظر قليلًا ثم أعد المحاولة.',
  login_required: 'انتهت جلستك. سجّل الدخول من جديد.',
  forbidden: 'هذا الإجراء متاح لأخصائي التغذية فقط.',
  not_found: 'العنصر المطلوب غير موجود.',
  invalid_input: 'تحقق من البيانات المدخلة ثم حاول مرة أخرى.',
  invalid_date: 'التاريخ أو الموعد غير صحيح.',
  dietitian_code_invalid: 'كود الأخصائي غير صحيح.',
  dietitian_registration_disabled: 'تسجيل حساب الأخصائي غير مفعّل على هذا الموقع.',
  payment_unconfirmed: 'لم يتم تأكيد عملية الدفع. تحقق قبل إعادة المحاولة.',
  payment_not_pending: 'هذا التحويل تمت مراجعته بالفعل.',
  activation_required: 'حسابك بانتظار التفعيل. أرسل التحويل على فودافون كاش وانتظر تأكيد الدكتورة.',
  write_unconfirmed: 'لم يتم تأكيد الحفظ. أعد تحميل الصفحة للتحقق.',
  subscription_unconfirmed: 'تم الدفع لكن تعذر تفعيل الاشتراك. راجع الأخصائي.',
  registration_unconfirmed: 'تعذر تأكيد إنشاء الحساب. حاول مرة أخرى.',
  logout_unconfirmed: 'تعذر إنهاء الجلسة مؤقتًا. حاول مرة أخرى.',
  password_unconfirmed: 'تعذر تأكيد تغيير كلمة المرور.',
  payload_too_large: 'حجم البيانات أكبر من المسموح.',
  invalid_image: 'الصورة غير مدعومة. استخدم صورة JPG أو PNG واضحة.',
  image_too_large: 'حجم الصورة كبير. جرّب صورة أوضح وبحجم أقل.',
  database_unavailable: 'قاعدة بيانات الموقع غير متاحة مؤقتًا. حاول بعد قليل.',
  service_unavailable: 'الخدمة غير متاحة مؤقتًا. حاول بعد قليل.',
  session_unavailable: 'تعذر بدء الجلسة. حاول مرة أخرى.',
  limiter_busy: 'الخدمة مشغولة. حاول بعد لحظات.',
  origin_forbidden: 'تعذر التحقق من مصدر الطلب.',
  request_failed: 'لم تكتمل العملية. حاول مرة أخرى.',
  network_error: 'تعذر الاتصال بالخدمة. تحقق من اتصالك بالإنترنت.',
  invalid_response: 'وصل رد غير متوقع من الخدمة.',
};

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code: string, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  idempotencyKey?: string;
  signal?: AbortSignal;
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey;

  let response: Response;
  try {
    response = await fetch(`/functions/v1/app${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      credentials: 'same-origin',
      signal: options.signal,
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new ApiError(messages.network_error, 'network_error');
  }

  const isJson = response.headers.get('content-type')?.includes('application/json') ?? false;
  let data: unknown = null;
  if (isJson) {
    try { data = await response.json(); } catch { data = null; }
  }

  if (!response.ok) {
    if (response.status === 401) window.dispatchEvent(new Event('ghizai:unauthorized'));
    const body = data && typeof data === 'object' ? data as Record<string, unknown> : null;
    const code = typeof body?.error === 'string'
      ? body.error
      : response.status === 401 ? 'login_required'
      : response.status === 403 ? 'forbidden'
      : 'request_failed';
    throw new ApiError(messages[code] ?? messages.request_failed, code, response.status);
  }

  if (data === null) throw new ApiError(messages.invalid_response, 'invalid_response', response.status);
  return data as T;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return messages.request_failed;
}
