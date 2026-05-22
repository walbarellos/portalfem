import { createDirectus, rest, readItems, readItem, staticToken } from '@directus/sdk';
import type { Schema, Noticia, Evento, Edital, ServicoSistema, EspacoCultural } from '../schemas/directus';

const DIRECTUS_URL = import.meta.env.PUBLIC_DIRECTUS_URL || 'http://localhost:8055';
const DIRECTUS_TOKEN = import.meta.env.PUBLIC_DIRECTUS_TOKEN || '';

export const directus = createDirectus<Schema>(DIRECTUS_URL)
  .with(staticToken(DIRECTUS_TOKEN))
  .with(rest());

export { readItems, readItem };

export async function safeRequest<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch (err) {
    console.warn('[directus] Erro ao buscar dados:', err instanceof Error ? err.message : err);
    return fallback;
  }
}

export async function getUltimasNoticias(limit = 6): Promise<Noticia[]> {
  return safeRequest(
    directus.request(readItems('noticias', {
      filter: { status: { _eq: 'published' } },
      sort: ['-data_publicacao'],
      limit,
      fields: ['id', 'titulo', 'resumo', 'data_publicacao', 'imagem_destaque', 'autor', 'categoria'],
    })),
    []
  );
}

export async function getNoticia(id: number): Promise<Noticia | null> {
  return safeRequest(
    directus.request(readItem('noticias', id, {
      fields: ['*', { autor: ['id', 'first_name', 'last_name'] }],
    })),
    null
  );
}

export async function getEditaisAbertos(): Promise<Edital[]> {
  return safeRequest(
    directus.request(readItems('editais', {
      filter: {
        status: { _eq: 'published' },
        status_label: { _eq: 'aberto' },
      },
      sort: ['data_encerramento'],
      fields: ['id', 'titulo', 'numero', 'data_abertura', 'data_encerramento', 'resumo', 'link_pdf'],
    })),
    []
  );
}

export async function getEditais(): Promise<Edital[]> {
  return safeRequest(
    directus.request(readItems('editais', {
      filter: { status: { _eq: 'published' } },
      sort: ['-data_abertura'],
      fields: ['*', { categoria: ['id', 'nome', 'slug'] }],
    })),
    []
  );
}

export async function getEdital(id: number): Promise<Edital | null> {
  return safeRequest(
    directus.request(readItem('editais', id, {
      fields: ['*', { categoria: ['id', 'nome', 'slug'] }],
    })),
    null
  );
}

export async function getProximosEventos(limit = 4): Promise<Evento[]> {
  return safeRequest(
    directus.request(readItems('eventos', {
      filter: {
        status: { _eq: 'published' },
        data_inicio: { _gte: new Date().toISOString() },
      },
      sort: ['data_inicio'],
      limit,
      fields: ['id', 'titulo', 'descricao', 'data_inicio', 'data_fim', 'local', 'categoria', 'destaque', 'horario', 'gratuito', 'imagem_capa'],
    })),
    []
  );
}

export async function getEvento(id: number): Promise<Evento | null> {
  return safeRequest(
    directus.request(readItem('eventos', id)),
    null
  );
}

export async function getPaginaInstitucional(slug: string) {
  const result = await safeRequest(
    directus.request(readItems('paginas_institucionais', {
      filter: {
        slug: { _eq: slug },
        status: { _eq: 'published' },
      },
      limit: 1,
    })),
    []
  );
  return result?.[0] ?? null;
}

export async function getServicos(): Promise<ServicoSistema[]> {
  return safeRequest(
    directus.request(readItems('servicos_sistemas', {
      filter: { ativo: { _eq: true } },
      sort: ['ordem'],
    })),
    []
  );
}

export async function getEspacosCulturais(): Promise<EspacoCultural[]> {
  return safeRequest(
    directus.request(readItems('espacos_culturais', {
      filter: { status: { _eq: 'published' } },
    })),
    []
  );
}

export async function buscarConteudo(query: string) {
  const [noticias, editais, eventos] = await Promise.all([
    safeRequest(
      directus.request(readItems('noticias', {
        search: query,
        filter: { status: { _eq: 'published' } },
        limit: 10,
        fields: ['id', 'titulo', 'resumo', 'data_publicacao'],
      })),
      []
    ),
    safeRequest(
      directus.request(readItems('editais', {
        search: query,
        filter: { status: { _eq: 'published' } },
        limit: 10,
        fields: ['id', 'titulo', 'numero', 'resumo'],
      })),
      []
    ),
    safeRequest(
      directus.request(readItems('eventos', {
        search: query,
        filter: { status: { _eq: 'published' } },
        limit: 10,
        fields: ['id', 'titulo', 'descricao', 'data_inicio', 'local'],
      })),
      []
    ),
  ]);

  return { noticias, editais, eventos };
}

export async function getAllNoticias() {
  return safeRequest(
    directus.request(readItems('noticias', {
      filter: { status: { _eq: 'published' } },
      sort: ['-data_publicacao'],
      fields: ['id', 'titulo', 'resumo', 'data_publicacao', 'imagem_destaque'],
    })),
    []
  );
}

export async function getAllEventos() {
  return safeRequest(
    directus.request(readItems('eventos', {
      filter: { status: { _eq: 'published' } },
      sort: ['-data_inicio'],
      fields: ['id', 'titulo', 'descricao', 'data_inicio', 'data_fim', 'local', 'imagem_capa'],
    })),
    []
  );
}

export async function getAllEditais() {
  return safeRequest(
    directus.request(readItems('editais', {
      filter: { status: { _eq: 'published' } },
      sort: ['-data_abertura'],
      fields: ['*', { categoria: ['id', 'nome', 'slug'] }],
    })),
    []
  );
}

export async function getAllPaginasInstitucionais() {
  return safeRequest(
    directus.request(readItems('paginas_institucionais', {
      filter: { status: { _eq: 'published' } },
      sort: ['menu_position'],
    })),
    []
  );
}
