const DIRECTUS_URL = process.env.DIRECTUS_URL || 'http://localhost:8055';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@femcultura.ac.gov.br';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

let token = '';
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function api(endpoint: string, options: RequestInit = {}) {
  const url = `${DIRECTUS_URL}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers });
  const body = await res.json();

  if (!res.ok) {
    if (body.errors) {
      const msgs = body.errors.map((e: any) => e.message).join(', ');
      throw new Error(`${res.status}: ${msgs}`);
    }
    throw new Error(`${res.status}: ${JSON.stringify(body)}`);
  }

  return body.data;
}

async function login() {
  const data = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  token = data.access_token;
  console.log('✅ Logado como admin');
}

async function createCollection(collection: string, meta: Record<string, any>, fields: Record<string, any>[]) {
  try {
    // Primeiro deleta se já existe para recriar corretamente
    try {
      await api(`/collections/${collection}`, { method: 'DELETE' });
    } catch (_) {
      // Não existe, ok
    }
    await api('/collections', {
      method: 'POST',
      body: JSON.stringify({ collection, meta, schema: {}, fields }),
    });
    console.log(`  ✅ Coleção criada: ${collection}`);
  } catch (err: any) {
    if (err.message?.includes('already exists')) {
      console.log(`  ⚠️ Coleção já existe: ${collection}`);
    } else {
      throw err;
    }
  }
}

async function createPolicy(name: string, options: Record<string, any>) {
  try {
    const data = await api('/policies', {
      method: 'POST',
      body: JSON.stringify({ name, ...options }),
    });
    console.log(`  ✅ Policy criada: ${name} (ID: ${data.id})`);
    return data.id;
  } catch (err: any) {
    if (err.message?.includes('already exists')) {
      console.log(`  ⚠️ Policy já existe: ${name}`);
      const policies = await api('/policies', { method: 'GET' });
      const existing = policies.find((p: any) => p.name === name);
      return existing?.id;
    }
    throw err;
  }
}

async function createPermission(policy: string, collection: string, action: string, options: Record<string, any> = {}) {
  try {
    await api('/permissions', {
      method: 'POST',
      body: JSON.stringify({ policy, collection, action, ...options }),
    });
    console.log(`  🔑 Permissão: ${action} em ${collection}`);
  } catch (err: any) {
    if (err.message?.includes('already exists')) {
      // ok
    } else {
      console.warn(`  ⚠️ Erro ao criar permissão ${action} em ${collection}: ${err.message}`);
    }
  }
}

async function seedContent() {
  // Categorias de Editais
  const categorias = [
    { nome: 'Lei Paulo Gustavo', slug: 'lei-paulo-gustavo' },
    { nome: 'PNAB', slug: 'pnab' },
    { nome: 'Fundo Estadual de Cultura', slug: 'fundo-estadual' },
    { nome: 'Chamamento Público', slug: 'chamamento-publico' },
  ];

  for (const cat of categorias) {
    try {
      const existing = await api(`/items/categorias_editais?filter[slug][_eq]=${cat.slug}`);
      if (existing.length === 0) {
        await api('/items/categorias_editais', { method: 'POST', body: JSON.stringify(cat) });
        console.log(`  ✅ Categoria criada: ${cat.nome}`);
      } else {
        console.log(`  ⚠️ Categoria já existe: ${cat.nome}`);
      }
    } catch (err: any) {
      console.warn(`  ⚠️ Erro ao criar categoria ${cat.nome}: ${err.message}`);
    }
  }

  await delay(500);

  // Notícia de exemplo
  try {
    const noticias = await api('/items/noticias?limit=1');
    if (noticias.length === 0) {
      await api('/items/noticias', {
        method: 'POST',
        body: JSON.stringify({
          titulo: 'Governo do Acre aprova Plano Estadual de Cultura',
          resumo: 'Documento consolida política cultural para a próxima década no estado.',
          conteudo: `<p>O Governo do Estado do Acre oficializou, por meio do Decreto nº 11.818, o Plano Estadual de Cultura (PEC), que estabelece diretrizes, estratégias e metas para o desenvolvimento cultural no estado pelos próximos 10 anos.</p><p>O plano foi construído de forma participativa, com consultas públicas em todos os 22 municípios do Acre, envolvendo artistas, produtores culturais, gestores públicos e sociedade civil.</p><p>Entre as metas estão a ampliação do financiamento à cultura, a criação de novos equipamentos culturais e a valorização da diversidade cultural acreana.</p>`,
          data_publicacao: new Date().toISOString(),
          categoria: 'institucional',
          status: 'published',
        }),
      });
      console.log('  ✅ Notícia de exemplo criada');
    } else {
      console.log('  ⚠️ Notícia já existe');
    }
  } catch (err: any) {
    console.warn(`  ⚠️ Erro ao criar notícia: ${err.message}`);
  }

  await delay(500);

  // Segunda notícia
  try {
      await api('/items/noticias', {
      method: 'POST',
      body: JSON.stringify({
        titulo: 'Edital nº 005/2025 - Arte e Patrimônio está com inscrições abertas',
        resumo: 'Seleção de projetos nas áreas de artes visuais, música e patrimônio cultural. Inscrições até 30 de junho.',
        conteudo: `<p>A Fundação de Cultura Elias Mansour (FEM) lançou o Edital nº 005/2025, com recursos da Lei Paulo Gustavo, para selecionar projetos culturais nas áreas de artes visuais, música e patrimônio cultural.</p><p>Serão investidos R$ 500.000,00 em projetos que valorizem a cultura acreana. Podem se inscrever pessoas físicas e jurídicas do setor cultural.</p>`,
        data_publicacao: new Date(Date.now() - 86400000).toISOString(),
        categoria: 'editais',
        status: 'published',
      }),
    });
    console.log('  ✅ Segunda notícia criada');
  } catch (err: any) {
    console.warn(`  ⚠️ ${err.message}`);
  }

  await delay(500);

  // Edital de exemplo
  const dataAbertura = new Date();
  const dataEncerramento = new Date(Date.now() + 30 * 86400000);
  try {
    const editais = await api('/items/editais?limit=1');
    if (editais.length === 0) {
      await api('/items/editais', {
        method: 'POST',
        body: JSON.stringify({
          titulo: 'Edital nº 005/2025 - Arte e Patrimônio',
          numero: '005/2025',
          data_abertura: dataAbertura.toISOString().split('T')[0],
          data_encerramento: dataEncerramento.toISOString().split('T')[0],
          status_label: 'aberto',
          resumo: 'Seleção de projetos nas áreas de artes visuais, música e patrimônio cultural.',
          status: 'published',
        }),
      });
      console.log('  ✅ Edital de exemplo criado');
    } else {
      console.log('  ⚠️ Edital já existe');
    }
  } catch (err: any) {
    console.warn(`  ⚠️ Erro ao criar edital: ${err.message}`);
  }

  await delay(500);

  // Evento de exemplo
  const eventoInicio = new Date(Date.now() + 15 * 86400000);
  const eventoFim = new Date(Date.now() + 16 * 86400000);
  try {
    const eventos = await api('/items/eventos?limit=1');
    if (eventos.length === 0) {
      await api('/items/eventos', {
        method: 'POST',
        body: JSON.stringify({
          titulo: 'Exposição "Acre em Cores" - Arte e Cultura',
          descricao: '<p>Mostra coletiva com obras de artistas acreanos contemporâneos. Pinturas, esculturas e instalações que retratam a diversidade cultural do Acre.</p>',
          data_inicio: eventoInicio.toISOString(),
          data_fim: eventoFim.toISOString(),
          local: 'Museu da Borracha - Rio Branco, AC',
          categoria: 'artes_visuais',
          horario: '10:00 - 18:00',
          gratuito: true,
          status: 'published',
        }),
      });
      console.log('  ✅ Evento de exemplo criado');
    } else {
      console.log('  ⚠️ Evento já existe');
    }
  } catch (err: any) {
    console.warn(`  ⚠️ Erro ao criar evento: ${err.message}`);
  }

  // Serviços
  const servicos = [
    { titulo: 'Cadastro Cultural', descricao: 'Cadastre-se no mapeamento cultural do Acre', icone: '🎨', url: '/sistemas/cadastro-cultural', ordem: 1, ativo: true },
    { titulo: 'Solicitar Espaço', descricao: 'Reserve espaços culturais da FEM', icone: '🏛️', url: '/sistemas/solicitacao-espacos', ordem: 2, ativo: true },
    { titulo: 'Parecerista', descricao: 'Acesse o sistema de pareceristas', icone: '📋', url: '/sistemas/parecerista', ordem: 3, ativo: true },
    { titulo: 'Transparência', descricao: 'Acompanhe gastos e licitações', icone: '🔍', url: 'https://transparencia.ac.gov.br', ordem: 4, ativo: true },
  ];

  await delay(500);

  for (const servico of servicos) {
    try {
      const existing = await api(`/items/servicos_sistemas?filter[titulo][_eq]=${encodeURIComponent(servico.titulo)}`);
      if (existing.length === 0) {
        await api('/items/servicos_sistemas', { method: 'POST', body: JSON.stringify(servico) });
        console.log(`  ✅ Serviço criado: ${servico.titulo}`);
      }
    } catch (err: any) {
      console.warn(`  ⚠️ Erro ao criar serviço: ${err.message}`);
    }
  }

  await delay(500);

  // Página institucional
  try {
    const paginas = await api('/items/paginas_institucionais?limit=1');
    if (paginas.length === 0) {
      await api('/items/paginas_institucionais', {
        method: 'POST',
        body: JSON.stringify({
          slug: 'quem-somos',
          titulo: 'Quem Somos',
          conteudo: `<p>A Fundação de Cultura Elias Mansour (FEM) é uma entidade da administração indireta do Governo do Estado do Acre, vinculada à Secretaria de Estado de Cultura.</p><p>Fundada em 1988, a FEM tem como missão promover, fomentar e difundir a produção cultural acreana, garantindo o acesso da população aos bens e serviços culturais.</p>`,
          menu_position: 1,
          status: 'published',
        }),
      });
      console.log('  ✅ Página institucional criada');
    }
  } catch (err: any) {
    console.warn(`  ⚠️ Erro ao criar página: ${err.message}`);
  }

  await delay(500);

  // Espaço cultural
  try {
    const espacos = await api('/items/espacos_culturais?limit=1');
    if (espacos.length === 0) {
      await api('/items/espacos_culturais', {
        method: 'POST',
        body: JSON.stringify({
          nome: 'Museu da Borracha',
          descricao: 'Museu histórico que conta a história do ciclo da borracha no Acre.',
          endereco: 'Av. Getúlio Vargas, 123 - Centro, Rio Branco - AC',
          latitude: -9.9743,
          longitude: -67.8103,
          horario_funcionamento: 'Ter-Dom: 8h às 18h',
          categoria: 'museu',
          status: 'published',
        }),
      });
      console.log('  ✅ Espaço cultural criado');
    }
  } catch (err: any) {
    console.warn(`  ⚠️ Erro ao criar espaço: ${err.message}`);
  }
}

async function main() {
  console.log('═══════════════════════════════════════');
  console.log('  Setup do Portal FEM - Directus');
  console.log('═══════════════════════════════════════\n');

  await login();

  // 1. Criar coleções
  console.log('\n📦 Criando coleções...');

  await createCollection('noticias', {
    icon: 'article',
    note: 'Notícias institucionais da FEM',
    display_template: '{{titulo}}',
  }, [
    { field: 'titulo', type: 'string', meta: { required: true, width: 'full', interface: 'input', options: { placeholder: 'Título da notícia' } } },
    { field: 'resumo', type: 'text', meta: { required: true, interface: 'input-multiline', options: { placeholder: 'Breve resumo' } } },
    { field: 'conteudo', type: 'text', meta: { required: true, interface: 'input-rich-text-html', options: { placeholder: 'Conteúdo completo' } } },
    { field: 'imagem_destaque', type: 'uuid', meta: { interface: 'file-image', special: ['file'] } },
    { field: 'data_publicacao', type: "dateTime", meta: { required: true, interface: "dateTime", options: { includeSeconds: true } } },
    { field: 'autor', type: 'uuid', meta: { interface: 'user-created', special: ['user-created'], readonly: true } },
    { field: 'categoria', type: 'string', meta: { interface: 'select-dropdown', options: { choices: [
      { text: 'Destaque', value: 'destaque' },
      { text: 'Editais', value: 'editais' },
      { text: 'Música', value: 'musica' },
      { text: 'Patrimônio', value: 'patrimonio' },
      { text: 'Artes Visuais', value: 'artes_visuais' },
      { text: 'Institucional', value: 'institucional' },
      { text: 'Educação', value: 'educacao' },
      { text: 'Eventos', value: 'eventos' },
    ]}} },
    { field: 'slug', type: 'string', meta: { interface: 'input', options: { placeholder: 'titulo-da-noticia' } } },
    { field: 'destaque', type: 'boolean', meta: { interface: 'boolean' }, schema: { default_value: false } },
    { field: 'status', type: 'string', meta: { required: true, interface: 'select-dropdown', options: { choices: [
      { text: 'Rascunho', value: 'draft' },
      { text: 'Publicado', value: 'published' },
    ]}, default_value: 'draft' } },
  ]);

  await createCollection('eventos', {
    icon: 'event',
    note: 'Eventos culturais',
    display_template: '{{titulo}}',
  }, [
    { field: 'titulo', type: 'string', meta: { required: true, interface: 'input' } },
    { field: 'descricao', type: 'text', meta: { interface: 'input-rich-text-html' } },
    { field: 'data_inicio', type: "dateTime", meta: { required: true, interface: "dateTime" } },
    { field: 'data_fim', type: "dateTime", meta: { interface: "dateTime" } },
    { field: 'local', type: 'string', meta: { required: true, interface: 'input' } },
    { field: 'link_inscricao', type: 'string', meta: { interface: 'input', options: { placeholder: 'https://...' } } },
    { field: 'imagem_capa', type: 'uuid', meta: { interface: 'file-image', special: ['file'] } },
    { field: 'categoria', type: 'string', meta: { interface: 'select-dropdown', options: { choices: [
      { text: 'Música', value: 'musica' },
      { text: 'Teatro', value: 'teatro' },
      { text: 'Artes Visuais', value: 'artes_visuais' },
      { text: 'Literatura', value: 'literatura' },
    ]}} },
    { field: 'destaque', type: 'boolean', meta: { interface: 'boolean', default_value: false } },
    { field: 'horario', type: 'string', meta: { interface: 'input', options: { placeholder: '19:00 - 21:30' } } },
    { field: 'gratuito', type: 'boolean', meta: { interface: 'boolean', default_value: false } },
    { field: 'pdf_programacao', type: 'uuid', meta: { interface: 'file', special: ['file'] } },
    { field: 'galeria', type: 'json', meta: { interface: 'list', special: ['json'], options: {
      template: '{{file}}',
      fields: [
        { field: 'file', type: 'uuid', meta: { interface: 'file', special: ['file'] } },
      ],
    } } },
    { field: 'status', type: 'string', meta: { interface: 'select-dropdown', options: { choices: [
      { text: 'Rascunho', value: 'draft' },
      { text: 'Publicado', value: 'published' },
    ]}, default_value: 'draft' } },
  ]);

  await createCollection('categorias_editais', {
    icon: 'category',
    note: 'Categorias para classificar editais',
    display_template: '{{nome}}',
  }, [
    { field: 'nome', type: 'string', meta: { required: true, interface: 'input' } },
    { field: 'slug', type: 'string', meta: { required: true, unique: true, interface: 'input' } },
  ]);

  await createCollection('editais', {
    icon: 'description',
    note: 'Editais, chamamentos e resultados',
    display_template: '{{numero}} - {{titulo}}',
  }, [
    { field: 'titulo', type: 'string', meta: { required: true, interface: 'input' } },
    { field: 'numero', type: 'string', meta: { required: true, interface: 'input' } },
    { field: 'data_abertura', type: 'date', meta: { required: true, interface: 'date' } },
    { field: 'data_encerramento', type: 'date', meta: { required: true, interface: 'date' } },
    { field: 'status_label', type: 'string', schema: { is_nullable: false }, meta: { required: true, interface: 'select-dropdown', options: { choices: [
      { text: 'Aberto', value: 'aberto' },
      { text: 'Encerrado', value: 'encerrado' },
      { text: 'Breve', value: 'breve' },
    ]}, default_value: 'aberto' } },
    { field: 'link_pdf', type: 'uuid', meta: { interface: 'file', special: ['file'] } },
    { field: 'link_inscricao', type: 'string', meta: { interface: 'input', options: { placeholder: 'https://forms.google.com/...' } } },
    { field: 'pdf_edital', type: 'uuid', meta: { interface: 'file', special: ['file'] } },
    { field: 'pdf_diario_oficial', type: 'uuid', meta: { interface: 'file', special: ['file'] } },
    { field: 'anexos', type: 'json', meta: { interface: 'list', special: ['json'], options: {
      template: '{{nome}}',
      fields: [
        { field: 'nome', type: 'string', meta: { interface: 'input', width: 'half' } },
        { field: 'arquivo', type: 'uuid', meta: { interface: 'file', special: ['file'], width: 'half' } },
      ],
    } } },
    { field: 'resumo', type: 'text', meta: { interface: 'input-multiline' } },
    { field: 'categoria', type: 'integer', meta: { interface: 'select-dropdown-m2o', special: ['m2o'] } },
    { field: 'status', type: 'string', meta: { interface: 'select-dropdown', options: { choices: [
      { text: 'Rascunho', value: 'draft' },
      { text: 'Publicado', value: 'published' },
    ]}, default_value: 'draft' } },
  ]);

  await createCollection('chamamentos', {
    icon: 'campaign',
    note: 'Chamamentos públicos',
    display_template: '{{titulo}}',
  }, [
    { field: 'titulo', type: 'string', meta: { required: true, interface: 'input' } },
    { field: 'descricao', type: 'text', meta: { interface: 'input-rich-text-html' } },
    { field: 'data_publicacao', type: 'date', meta: { interface: 'date' } },
    { field: 'arquivo', type: 'uuid', meta: { interface: 'file', special: ['file'] } },
    { field: 'status', type: 'string', meta: { interface: 'select-dropdown', options: { choices: [
      { text: 'Rascunho', value: 'draft' },
      { text: 'Publicado', value: 'published' },
    ]}, default_value: 'draft' } },
  ]);

  await createCollection('resultados', {
    icon: 'fact_check',
    note: 'Resultados de editais',
    display_template: '{{titulo}}',
  }, [
    { field: 'titulo', type: 'string', meta: { required: true, interface: 'input' } },
    { field: 'descricao', type: 'text', meta: { interface: 'input-rich-text-html' } },
    { field: 'data_publicacao', type: 'date', meta: { interface: 'date' } },
    { field: 'arquivo', type: 'uuid', meta: { interface: 'file', special: ['file'] } },
    { field: 'edital_relacionado', type: 'integer', meta: { interface: 'select-dropdown-m2o', special: ['m2o'] } },
    { field: 'status', type: 'string', meta: { interface: 'select-dropdown', options: { choices: [
      { text: 'Rascunho', value: 'draft' },
      { text: 'Publicado', value: 'published' },
    ]}, default_value: 'draft' } },
  ]);

  await createCollection('paginas_institucionais', {
    icon: 'article',
    note: 'Páginas institucionais (quem somos, legislacao, etc.)',
    display_template: '{{titulo}}',
  }, [
    { field: 'slug', type: 'string', meta: { required: true, unique: true, interface: 'input' } },
    { field: 'titulo', type: 'string', meta: { required: true, interface: 'input' } },
    { field: 'conteudo', type: 'text', meta: { interface: 'input-rich-text-html' } },
    { field: 'menu_position', type: 'integer', meta: { interface: 'input', options: { placeholder: 'Ordem no menu' } } },
    { field: 'status', type: 'string', meta: { interface: 'select-dropdown', options: { choices: [
      { text: 'Rascunho', value: 'draft' },
      { text: 'Publicado', value: 'published' },
    ]}, default_value: 'draft' } },
  ]);

  await createCollection('servicos_sistemas', {
    icon: 'apps',
    note: 'Portal de serviços e sistemas',
    display_template: '{{titulo}}',
  }, [
    { field: 'titulo', type: 'string', meta: { required: true, interface: 'input' } },
    { field: 'descricao', type: 'text', meta: { interface: 'input-multiline' } },
    { field: 'icone', type: 'string', meta: { required: true, interface: 'input', options: { placeholder: '🎨' } } },
    { field: 'url', type: 'string', meta: { required: true, interface: 'input', options: { placeholder: 'https://...' } } },
    { field: 'ordem', type: 'integer', meta: { interface: 'input' } },
    { field: 'ativo', type: 'boolean', meta: { interface: 'boolean', default_value: true } },
  ]);

  await createCollection('espacos_culturais', {
    icon: 'location_city',
    note: 'Espaços culturais gerenciados pela FEM',
    display_template: '{{nome}}',
  }, [
    { field: 'nome', type: 'string', meta: { required: true, interface: 'input' } },
    { field: 'descricao', type: 'text', meta: { interface: 'input-rich-text-html' } },
    { field: 'endereco', type: 'text', meta: { interface: 'input-multiline' } },
    { field: 'latitude', type: 'decimal', meta: { interface: 'input', options: { placeholder: '-9.9743' } } },
    { field: 'longitude', type: 'decimal', meta: { interface: 'input', options: { placeholder: '-67.8103' } } },
    { field: 'imagem', type: 'uuid', meta: { interface: 'file-image', special: ['file'] } },
    { field: 'horario_funcionamento', type: 'string', meta: { interface: 'input' } },
    { field: 'categoria', type: 'string', meta: { interface: 'select-dropdown', options: { choices: [
      { text: 'Museu', value: 'museu' },
      { text: 'Teatro', value: 'teatro' },
      { text: 'Biblioteca', value: 'biblioteca' },
      { text: 'Espaço de Memória', value: 'espaco_memoria' },
      { text: 'Centro Cultural', value: 'centro_cultural' },
    ]}} },
    { field: 'status', type: 'string', meta: { interface: 'select-dropdown', options: { choices: [
      { text: 'Rascunho', value: 'draft' },
      { text: 'Publicado', value: 'published' },
    ]}, default_value: 'draft' } },
  ]);

  console.log('\n✅ Todas as coleções criadas!');

  // Pequena pausa para o Directus processar
  await delay(2000);

  // Re-login para refrescar permissões do admin
  console.log('\n🔄 Re-autenticando para refrescar permissões...');
  await login();

  // 2. Criar Policies
  console.log('\n🔐 Criando Policies (RBAC)...');

  await delay(1000);

  // Policy: Jornalismo
  const jornalismoId = await createPolicy('Jornalismo (Comunicação)', {
    description: 'Pode gerenciar notícias e eventos',
    icon: 'campaign',
    admin_access: false,
    app_access: true,
  });

  if (jornalismoId) {
    for (const action of ['create', 'read', 'update', 'delete']) {
      await createPermission(jornalismoId, 'noticias', action, action === 'update' || action === 'delete'
        ? { permissions: { author: { _eq: '$CURRENT_USER' } } }
        : { permissions: {} }
      );
      await createPermission(jornalismoId, 'eventos', action, action === 'update' || action === 'delete'
        ? { permissions: { user_created: { _eq: '$CURRENT_USER' } } }
        : { permissions: {} }
      );
    }
  }

  // Policy: Editais
  const editaisRoleId = await createPolicy('Editais (Fomento)', {
    description: 'Pode gerenciar editais, chamamentos e resultados',
    icon: 'description',
    admin_access: false,
    app_access: true,
  });

  if (editaisRoleId) {
    for (const action of ['create', 'read', 'update', 'delete']) {
      for (const col of ['editais', 'chamamentos', 'resultados']) {
        await createPermission(editaisRoleId, col, action, { permissions: {} });
      }
    }
    await createPermission(editaisRoleId, 'categorias_editais', 'read', { permissions: {} });
  }

  // Policy: Leitor Público
  const leitorId = await createPolicy('Leitor Público (API)', {
    description: 'Acesso de leitura via API para o frontend',
    icon: 'visibility',
    admin_access: false,
    app_access: false,
  });

  if (leitorId) {
    const lerPublicado = { status: { _eq: 'published' } };
    for (const col of ['noticias', 'eventos', 'editais']) {
      await createPermission(leitorId, col, 'read', { permissions: lerPublicado });
    }
    for (const col of ['chamamentos', 'resultados', 'categorias_editais', 'paginas_institucionais', 'espacos_culturais']) {
      await createPermission(leitorId, col, 'read', { permissions: {} });
    }
    await createPermission(leitorId, 'servicos_sistemas', 'read', { permissions: { ativo: { _eq: true } } });
  }

  // 3. Seed de conteúdo
  console.log('\n📝 Populando dados de exemplo...');
  await seedContent();

  // 4. Criar token de acesso público
  console.log('\n🔑 Criando token de acesso público...');
  try {
    const existingTokens = await api('/users/me/tokens');
    if (!Array.isArray(existingTokens) || existingTokens.length === 0) {
      const tokenData = await api('/users/me/tokens', {
        method: 'POST',
        body: JSON.stringify({ name: 'Frontend Public Token' }),
      });
      const tokenStr = typeof tokenData === 'string' ? tokenData : tokenData?.token || tokenData?.access_token;
      console.log(`  ✅ Token criado: ${tokenStr || '(verifique no painel)'}`);
      console.log(`  📝 Adicione ao frontend/.env:`);
      console.log(`     PUBLIC_DIRECTUS_TOKEN=${tokenStr || '<seu_token>'}`);
    } else {
      const existing = Array.isArray(existingTokens) ? existingTokens.find((t: any) => t.name === 'Frontend Public Token') : null;
      if (existing) {
        console.log(`  ℹ️  Token já existe. Use no frontend/.env:`);
        console.log(`     PUBLIC_DIRECTUS_TOKEN=${existing.token || existing.id}`);
      }
    }
  } catch (err: any) {
    console.warn(`  ⚠️ Token automático: ${err.message}`);
    console.log(`  📝 Crie manualmente em Settings > Access Tokens no painel`);
  }

  console.log('\n═══════════════════════════════════════');
  console.log('  ✅ Setup concluído com sucesso!');
  console.log('');
  console.log('  🌐  Admin Directus: http://localhost:8055');
  console.log('  📧  Email: admin@femcultura.ac.gov.br');
  console.log('  🔑  Senha: (definida no .env)');
  console.log('');
  console.log('  📦  Coleções criadas:');
  console.log('       - noticias');
  console.log('       - eventos');
  console.log('       - editais');
  console.log('       - categorias_editais');
  console.log('       - chamamentos');
  console.log('       - resultados');
  console.log('       - paginas_institucionais');
  console.log('       - servicos_sistemas');
  console.log('       - espacos_culturais');
  console.log('');
  console.log('  🔐  Policies criadas:');
  console.log('       - Jornalismo (Comunicação)');
  console.log('       - Editais (Fomento)');
  console.log('       - Leitor Público (API)');
  console.log('');
  console.log('  🔑  Token público criado');
  console.log('  💡  npm run dev no frontend para testar');
  console.log('═══════════════════════════════════════');
}

main().catch((err) => {
  console.error('\n❌ Erro durante setup:', err.message);
  process.exit(1);
});
