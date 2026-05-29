import type { APIRoute } from 'astro';

export const prerender = false;

const REBUILD_SECRET = import.meta.env.REBUILD_SECRET;
const REBUILD_URL = import.meta.env.REBUILD_URL || '';

export const POST: APIRoute = async ({ request }) => {
  try {
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
