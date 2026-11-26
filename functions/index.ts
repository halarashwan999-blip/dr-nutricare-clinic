import { createDatabaseClient, createSiteContext, errorResponse } from './_qoder/backend.mjs';
import { application } from './app.mjs';

const handle = application({ db: createDatabaseClient() });

const SECURITY_HEADERS: Record<string, string> = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
  'cross-origin-resource-policy': 'same-origin',
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
};

function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    if (!headers.has(key)) headers.set(key, value);
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

Deno.serve(async (request) => {
  let context;
  try {
    // Application-owned email/password sessions require our own cookies to survive the gateway.
    context = createSiteContext(request, { forwardApplicationCredentials: true });
    return withSecurityHeaders(await handle(context.request));
  } catch (error) {
    return withSecurityHeaders(errorResponse(error, context?.requestId));
  }
});
