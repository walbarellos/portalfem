import type { APIRoute } from 'astro';

export const prerender = false;

const DIRECTUS_URL = import.meta.env.PUBLIC_DIRECTUS_URL || 'http://localhost:8055';
const DIRECTUS_TOKEN = import.meta.env.DIRECTUS_TOKEN || '';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/html',
];

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

    if (!ALLOWED_MIME_TYPES.includes(contentType)) {
      console.warn(`[File] Tipo de arquivo bloqueado: ${contentType} (ID: ${id})`);
      return new Response('Tipo de arquivo não permitido', { status: 403 });
    }

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
