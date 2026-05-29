export interface Noticia {
  id: number;
  titulo: string;
  resumo: string;
  conteudo: string;
  imagem_destaque: string | null;
  data_publicacao: string;
  autor: number | { id: number; first_name: string; last_name: string } | null;
  categoria?: 'destaque' | 'editais' | 'musica' | 'patrimonio' | 'artes_visuais' | 'institucional' | 'educacao' | 'eventos';
  slug?: string | null;
  destaque?: boolean;
  status: 'draft' | 'published';
  date_created: string;
  date_updated: string;
}

export interface Evento {
  id: number;
  titulo: string;
  descricao: string;
  data_inicio: string;
  data_fim: string;
  local: string;
  link_inscricao?: string;
  imagem_capa?: string | null;
  categoria?: 'musica' | 'teatro' | 'artes_visuais' | 'literatura';
  destaque?: boolean;
  horario?: string;
  gratuito?: boolean;
  pdf_programacao?: string | null;
  galeria?: string[] | null;
  status: 'draft' | 'published';
  date_created: string;
  date_updated: string;
}

export interface Edital {
  id: number;
  titulo: string;
  numero: string;
  data_abertura: string;
  data_encerramento: string;
  status_label: 'aberto' | 'encerrado' | 'breve';
  link_pdf?: string | null;
  link_inscricao?: string | null;
  pdf_edital?: string | null;
  pdf_diario_oficial?: string | null;
  anexos?: Anexo[] | null;
  resumo: string;
  categoria?: number | CategoriaEdital | null;
  status: 'draft' | 'published';
  date_created: string;
  date_updated: string;
}

export interface Anexo {
  nome: string;
  arquivo: string;
}

export interface CategoriaEdital {
  id: number;
  nome: string;
  slug: string;
}

export interface Chamamento {
  id: number;
  titulo: string;
  descricao: string;
  data_publicacao: string;
  arquivo?: string | null;
  status: 'draft' | 'published';
}

export interface Resultado {
  id: number;
  titulo: string;
  descricao: string;
  data_publicacao: string;
  arquivo?: string | null;
  edital_relacionado?: number | Edital | null;
  status: 'draft' | 'published';
}

export interface PaginaInstitucional {
  id: number;
  slug: string;
  titulo: string;
  conteudo: string;
  menu_position?: number;
  status: 'draft' | 'published';
}

export interface ServicoSistema {
  id: number;
  titulo: string;
  descricao: string;
  icone?: string;
  url: string;
  ordem: number;
  ativo: boolean;
}

export interface EspacoCultural {
  id: number;
  nome: string;
  slug?: string;
  categoria: 'museu' | 'teatro' | 'biblioteca' | 'espaco_memoria' | 'centro_cultural' | 'casa_de_cultura';
  descricao: string;
  endereco: string;
  latitude?: number;
  longitude?: number;
  imagem?: string | null;
  horario_funcionamento?: string;
  status: 'draft' | 'published';
}

export interface Schema {
  noticias: Noticia[];
  eventos: Evento[];
  editais: Edital[];
  categorias_editais: CategoriaEdital[];
  chamamentos: Chamamento[];
  resultados: Resultado[];
  paginas_institucionais: PaginaInstitucional[];
  servicos_sistemas: ServicoSistema[];
  espacos_culturais: EspacoCultural[];
}
