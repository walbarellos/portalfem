import type { APIRoute } from 'astro';

export const prerender = false;

const DIRECTUS_URL = import.meta.env.PUBLIC_DIRECTUS_URL || 'http://localhost:8055';
const DIRECTUS_TOKEN = import.meta.env.PUBLIC_DIRECTUS_TOKEN || '';

export const GET: APIRoute = async ({ params }) => {
  const { id } = params;
  if (!id) {
    return new Response('ID não fornecido', { status: 400 });
  }

  try {
    const directusRes = await fetch(`${DIRECTUS_URL}/assets/${id}`, {
      headers: { 'Authorization': `Bearer ${DIRECTUS_TOKEN}` },
    });

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
