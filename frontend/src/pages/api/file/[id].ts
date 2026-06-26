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

const MAX_FILE_SIZE = 50 * 1024 * 1024;

const ID_REGEX = /^[a-zA-Z0-9_-]+$/;

export const GET: APIRoute = async ({ params }) => {
  const { id } = params;
  if (!id || !ID_REGEX.test(id)) {
    return new Response('ID inválido', { status: 400 });
  }

  if (!DIRECTUS_TOKEN) {
    console.error('[File] DIRECTUS_TOKEN não configurado');
    return new Response('Erro de configuração', { status: 500 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const directusRes = await fetch(`${DIRECTUS_URL}/assets/${id}`, {
      headers: { 'Authorization': `Bearer ${DIRECTUS_TOKEN}` },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!directusRes.ok) {
      return new Response('Arquivo não encontrado', { status: 404 });
    }

    const rawContentType = directusRes.headers.get('content-type') || 'application/octet-stream';
    const contentType = rawContentType.split(';')[0].toLowerCase().trim();

    const contentLength = directusRes.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_FILE_SIZE) {
      console.warn(`[File] Arquivo muito grande: ${contentLength} bytes (ID: ${id})`);
      return new Response('Arquivo excede o tamanho máximo permitido', { status: 413 });
    }

    if (!ALLOWED_MIME_TYPES.includes(contentType)) {
      console.warn(`[File] Tipo de arquivo bloqueado: ${contentType} (ID: ${id})`);
      return new Response('Tipo de arquivo não permitido', { status: 403 });
    }

    const blob = await directusRes.arrayBuffer();

    if (blob.byteLength > MAX_FILE_SIZE) {
      console.warn(`[File] Arquivo excede o tamanho máximo: ${blob.byteLength} bytes (ID: ${id})`);
      return new Response('Arquivo excede o tamanho máximo permitido', { status: 413 });
    }

    return new Response(blob, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': 'inline',
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (err) {
    console.error('[File] Erro ao buscar arquivo:', err instanceof Error ? err.message : err);
    return new Response('Erro ao carregar arquivo', { status: 500 });
  }
};
