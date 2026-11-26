export class AppError extends Error {
  constructor(code, status = 400) {
    super(code);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
  }
}

const NO_STORE = { 'cache-control': 'private, no-store', 'referrer-policy': 'no-referrer' };

export function json(value, status = 200, extra = {}) {
  return Response.json(value, { status, headers: { ...NO_STORE, ...extra } });
}

export function errorJson(code, status, extra = {}) {
  return json({ error: code }, status, extra);
}

// The gateway replaces `app` with the deployed physical name and may strip /functions/v1.
export function applicationPath(request) {
  const match = new URL(request.url).pathname.match(/^\/(?:functions\/v1\/)?(?:app|app-d[0-9a-f]{32})(\/.*)?$/);
  if (!match) throw new AppError('not_found', 404);
  return match[1] || '/';
}

function env(name) {
  try {
    const value = globalThis.Deno?.env?.get(name);
    if (value != null) return value;
  } catch { /* not running under Deno */ }
  try { return globalThis.process?.env?.[name] ?? null; } catch { return null; }
}

function isLoopback(origin) {
  try {
    const { hostname } = new URL(origin);
    return hostname === '127.0.0.1' || hostname === 'localhost' || hostname === '[::1]';
  } catch { return false; }
}

// Same-origin check for unsafe methods, in addition to SameSite=Lax cookies.
export function requireTrustedWrite(request) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return;
  const origin = request.headers.get('origin');
  if (!origin) return;
  const configured = env('APP_ORIGIN');
  if (configured) {
    if (origin !== configured) throw new AppError('origin_forbidden', 403);
    return;
  }
  const forwardedHost = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const forwardedProto = request.headers.get('x-forwarded-proto') ?? 'https';
  const candidates = [new URL(request.url).origin, isLoopback(origin) ? origin : null];
  if (forwardedHost) candidates.push(`${forwardedProto}://${forwardedHost}`);
  if (!candidates.includes(origin)) throw new AppError('origin_forbidden', 403);
}

export function isSecureRequest(request) {
  const configured = env('APP_ORIGIN');
  if (configured) return configured.startsWith('https://');
  const proto = request.headers.get('x-forwarded-proto') ?? new URL(request.url).protocol.replace(':', '');
  return proto === 'https';
}

// Reads the body while bounding the actual bytes, ignoring Content-Length.
export async function readJson(request, maxBytes = 16384) {
  const type = request.headers.get('content-type')?.split(';')[0].trim();
  if (type !== 'application/json') throw new AppError('invalid_input', 400);
  const reader = request.body?.getReader();
  if (!reader) throw new AppError('invalid_input', 400);
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maxBytes) {
        await reader.cancel();
        throw new AppError('payload_too_large', 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw new AppError('invalid_input', 400);
  }
}

// Converts SDK results into business data without exposing provider details.
export function rows(result) {
  if (result?.error || !Array.isArray(result?.data)) throw new AppError('database_unavailable', 503);
  return result.data;
}
