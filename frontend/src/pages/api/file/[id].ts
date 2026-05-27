import type { APIRoute } from 'astro';

export const prerender = false;

const DIRECTUS_URL = import.meta.env.PUBLIC_DIRECTUS_URL || 'http://localhost:8055';

let cachedToken: { token: string; expires: number } | null = null;

async function getToken(): Promise<string> {
  if (cachedToken && cachedToken.expires > Date.now()) {
    return cachedToken.token;
  }
  const res = await fetch(`${DIRECTUS_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@femcultura.ac.gov.br', password: 'F3m_Adm1n_2025_S3gur0' }),
  });
  const data = await res.json();
  cachedToken = { token: data.data.access_token, expires: Date.now() + 15 * 60 * 1000 };
  return data.data.access_token;
}

export const GET: APIRoute = async ({ params }) => {
  const { id } = params;
  if (!id) {
    return new Response('ID não fornecido', { status: 400 });
  }

  try {
    const token = await getToken();
    const directusRes = await fetch(`${DIRECTUS_URL}/assets/${id}?access_token=${token}`);

    if (!directusRes.ok) {
      return new Response('Arquivo não encontrado', { status: 404 });
    }

    const contentType = directusRes.headers.get('content-type') || 'application/octet-stream';
    const blob = await directusRes.arrayBuffer();

    return new Response(blob, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': 'inline',
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (err) {
    console.error('[File] Erro ao buscar arquivo:', err);
    return new Response('Erro ao carregar arquivo', { status: 500 });
  }
};
