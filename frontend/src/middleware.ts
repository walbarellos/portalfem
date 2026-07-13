import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);

  // Redireciona requisições com barra no final (trailing slash) para sem barra (301)
  if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
    const cleanPath = url.pathname.slice(0, -1);
    const redirectUrl = new URL(cleanPath + url.search, context.request.url);
    return Response.redirect(redirectUrl.toString(), 301);
  }

  const response = await next();

  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://vlibras.gov.br https://www.vlibras.gov.br https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https: blob:",
      "font-src 'self' https://fonts.gstatic.com https://vlibras.gov.br https://*.vlibras.gov.br https://cdn.jsdelivr.net data:",
      "connect-src 'self' https://femcultura.ac.gov.br https://vlibras.gov.br https://*.vlibras.gov.br https://cdn.jsdelivr.net",
      "media-src 'self' blob: data:",
      "worker-src 'self' blob:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
  );

  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=()'
  );

  return response;
});
