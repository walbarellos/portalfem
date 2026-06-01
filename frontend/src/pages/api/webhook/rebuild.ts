import type { APIRoute } from 'astro';

export const prerender = false;

const REBUILD_SECRET = import.meta.env.REBUILD_SECRET;
const REBUILD_URL = import.meta.env.REBUILD_URL || '';

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;
const rateMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_REQUESTS - 1 };
  }
  entry.count++;
  return { allowed: entry.count <= MAX_REQUESTS, remaining: Math.max(0, MAX_REQUESTS - entry.count) };
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
    const { allowed, remaining } = checkRateLimit(ip);
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Muitas requisições. Tente novamente em breve.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
      });
    }

    const authHeader = request.headers.get('authorization') || '';
    const webhookToken = request.headers.get('x-webhook-token') || '';
    const token = authHeader.replace('Bearer ', '') || webhookToken;

    if (token !== REBUILD_SECRET) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json().catch(() => ({}));
    const collection = body?.collection || body?.event?.collection || 'unknown';
    const action = body?.event?.action || 'unknown';

    console.log(`[Rebuild] Evento recebido: ${action} em ${collection}`);

    if (REBUILD_URL) {
      const response = await fetch(REBUILD_URL, { method: 'POST' });
      console.log(`[Rebuild] Webhook de build acionado: ${response.status}`);
    }

    return new Response(JSON.stringify({
      ok: true,
      message: `Evento ${action} em ${collection} processado`,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[Rebuild] Erro:', err);
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const ALL: APIRoute = async ({ request }) => {
  return POST({ request } as any);
};
