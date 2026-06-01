import { createDirectus, rest, readItems, readItem, staticToken } from '@directus/sdk';
import type { Schema, Noticia, Evento, Edital, ServicoSistema, EspacoCultural, Resultado } from '../schemas/directus';

const DIRECTUS_URL = import.meta.env.PUBLIC_DIRECTUS_URL || 'http://localhost:8055';
const DIRECTUS_TOKEN = import.meta.env.DIRECTUS_TOKEN || '';

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

export async function obterUltimasNoticias(limit = 6): Promise<Noticia[]> {
  return safeRequest<Noticia[]>(
    directus.request(readItems('noticias', {
      filter: { status: { _eq: 'published' } },
      sort: ['-data_publicacao'],
      limit,
      fields: ['id', 'titulo', 'resumo', 'data_publicacao', 'imagem_destaque', 'autor', 'categoria'],
    })) as Promise<Noticia[]>,
    []
  );
}

export async function obterNoticia(id: number): Promise<Noticia | null> {
  return safeRequest<Noticia | null>(
    directus.request(readItem('noticias', id, {
      fields: ['*', { autor: ['id', 'first_name', 'last_name'] }],
    })) as Promise<Noticia>,
    null
  );
}

export async function obterEditaisAbertos(): Promise<Edital[]> {
  return safeRequest<Edital[]>(
    directus.request(readItems('editais', {
      filter: {
        status: { _eq: 'published' },
        status_label: { _eq: 'aberto' },
      },
      sort: ['data_encerramento'],
      fields: ['id', 'titulo', 'numero', 'data_abertura', 'data_encerramento', 'resumo', 'link_pdf', 'status_label', { categoria: ['id', 'nome', 'slug'] }],
    })) as Promise<Edital[]>,
    []
  );
}

export async function obterEditais(): Promise<Edital[]> {
  return safeRequest(
    directus.request(readItems('editais', {
      filter: { status: { _eq: 'published' } },
      sort: ['-data_abertura'],
      fields: ['*', { categoria: ['id', 'nome', 'slug'] }],
    })),
    []
  );
}

export async function obterEdital(id: number): Promise<Edital | null> {
  return safeRequest(
    directus.request(readItem('editais', id, {
      fields: ['*', { categoria: ['id', 'nome', 'slug'] }],
    })),
    null
  );
}

const agora = new Date().toISOString();

export async function obterProximosEventos(limit = 4): Promise<Evento[]> {
  return safeRequest<Evento[]>(
    directus.request(readItems('eventos', {
      filter: {
        status: { _eq: 'published' },
        data_inicio: { _gte: agora },
      } as Record<string, unknown>,
      sort: ['data_inicio'],
      limit,
      fields: ['id', 'titulo', 'descricao', 'data_inicio', 'data_fim', 'local', 'categoria', 'destaque', 'horario', 'gratuito', 'imagem_capa'],
    })) as Promise<Evento[]>,
    []
  );
}

export async function obterEvento(id: number): Promise<Evento | null> {
  return safeRequest(
    directus.request(readItem('eventos', id)),
    null
  );
}

export async function obterPaginaInstitucional(slug: string) {
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

export async function obterServicos(): Promise<ServicoSistema[]> {
  return safeRequest(
    directus.request(readItems('servicos_sistemas', {
      filter: { ativo: { _eq: true } },
      sort: ['ordem'],
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

export async function obterTodasNoticias() {
  return safeRequest(
    directus.request(readItems('noticias', {
      filter: { status: { _eq: 'published' } },
      sort: ['-data_publicacao'],
      fields: ['id', 'titulo', 'resumo', 'data_publicacao', 'imagem_destaque'],
    })),
    []
  );
}

export async function obterTodosEventos() {
  return safeRequest(
    directus.request(readItems('eventos', {
      filter: { status: { _eq: 'published' } },
      sort: ['-data_inicio'],
      fields: ['id', 'titulo', 'descricao', 'data_inicio', 'data_fim', 'local', 'imagem_capa'],
    })),
    []
  );
}

export async function obterTodosEditais() {
  return safeRequest(
    directus.request(readItems('editais', {
      filter: { status: { _eq: 'published' } },
      sort: ['-data_abertura'],
      fields: ['*', { categoria: ['id', 'nome', 'slug'] }],
    })),
    []
  );
}

export async function obterTodasPaginasInstitucionais() {
  return safeRequest(
    directus.request(readItems('paginas_institucionais', {
      filter: { status: { _eq: 'published' } },
      sort: ['menu_position'],
    })),
    []
  );
}

export async function obterCategoriasEditais() {
  return safeRequest(
    directus.request(readItems('categorias_editais', {
      fields: ['id', 'nome', 'slug'],
    })),
    []
  );
}

export async function obterResultadosRecentes(limit = 4) {
  return safeRequest(
    directus.request(readItems('resultados', {
      filter: { status: { _eq: 'published' } },
      sort: ['-data_publicacao'],
      limit,
      fields: ['id', 'titulo', 'descricao', 'data_publicacao', 'arquivo', { edital_relacionado: ['id', 'titulo', 'numero'] }],
    })),
    []
  );
}
