const DIRECTUS_URL = 'http://localhost:8055';
const ADMIN_EMAIL = 'admin@femcultura.ac.gov.br';
const ADMIN_PASSWORD = 'F3m_Adm1n_2025_S3gur0';
const PUBLIC_TOKEN = 'fem-public-token-a1b2c3d4e5f6';

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
  let body: any;
  try { body = await res.json(); } catch { body = null; }

  if (!res.ok) {
    if (body?.errors) {
      const msgs = body.errors.map((e: any) => e.message).join(', ');
      throw new Error(`${res.status}: ${msgs}`);
    }
    throw new Error(`${res.status}: ${JSON.stringify(body)}`);
  }

  return body?.data ?? body;
}

async function login() {
  const data = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  token = data.access_token;
  console.log('✅ Logado como admin');
}

// ───── 1. Static Token ─────
async function createStaticToken() {
  console.log('\n🔑 Criando static token...');
  try {
    // Tenta definir o token no admin user
    await api('/users/me', {
      method: 'PATCH',
      body: JSON.stringify({ token: PUBLIC_TOKEN }),
    });
    console.log(`  ✅ Token definido: ${PUBLIC_TOKEN}`);
    console.log(`  📝 Adicione ao frontend/.env:`);
    console.log(`     PUBLIC_DIRECTUS_TOKEN=${PUBLIC_TOKEN}`);
  } catch (err: any) {
    console.warn(`  ⚠️ Erro: ${err.message}`);
    console.log(`  📝 Crie manualmente em Settings > Access Tokens no painel`);
    console.log(`     Token sugerido: ${PUBLIC_TOKEN}`);
  }
}

// ───── 2. Seed completo ─────
async function seedMoreContent() {
  console.log('\n📝 Populando dados completos...');
  await delay(500);

  // Notícias adicionais
  const noticias = [
    {
      titulo: 'Fundo Estadual de Cultura lança novo edital de fomento às artes integradas',
      resumo: 'Com investimento recorde, a nova chamada pública visa apoiar projetos que unem tecnologia, tradições locais e inovação social em todas as regionais do estado.',
      conteudo: '<p>Com investimento recorde de R$ 2 milhões, o Fundo Estadual de Cultura lançou o Edital nº 008/2025 para fomento às artes integradas. A chamada pública visa apoiar projetos que unem tecnologia, tradições locais e inovação social em todas as 22 regionais do estado do Acre.</p><p>Podem se inscrever pessoas físicas e jurídicas do setor cultural, com propostas que envolvam múltiplas linguagens artísticas.</p>',
      data_publicacao: new Date().toISOString(),
      categoria: 'editais',
      status: 'published',
    },
    {
      titulo: 'Galeria de Arte Juvenal Antunes inaugura nova mostra imersiva',
      resumo: 'A exposição conta com mais de 40 obras de artistas regionais utilizando projeções mapeadas e elementos interativos para recontar a história local.',
      conteudo: '<p>A Galeria de Arte Juvenal Antunes inaugurou sua mais nova exposição imersiva, "Acre em Camadas", que utiliza projeções mapeadas, realidade aumentada e instalações interativas para recontar a história do Acre sob a ótica de seus artistas.</p><p>A mostra reúne mais de 40 obras de 25 artistas regionais e fica em cartaz até dezembro.</p>',
      data_publicacao: new Date(Date.now() - 86400000).toISOString(),
      categoria: 'artes_visuais',
      status: 'published',
    },
    {
      titulo: 'Festival de Verão atrai milhares de pessoas no final de semana',
      resumo: 'Com atrações nacionais e locais, o evento promovido pela FEM consolidou-se como o maior encontro musical da região nesta temporada.',
      conteudo: '<p>O Festival de Verão 2025, promovido pela Fundação Elias Mansour, atraiu mais de 50 mil pessoas durante o final de semana na Praia da Amizade. Com atrações nacionais e locais, o evento consolidou-se como o maior encontro musical da região Norte nesta temporada.</p><p>A programação incluiu shows de artistas acreanos, paraenses e amazonenses, além de uma feira de economia criativa.</p>',
      data_publicacao: new Date(Date.now() - 172800000).toISOString(),
      categoria: 'musica',
      status: 'published',
    },
    {
      titulo: 'Programa de restauro de acervos históricos entra em nova fase',
      resumo: 'Equipes especializadas iniciam os trabalhos de conservação preventiva nos museus estaduais, garantindo a longevidade de peças centenárias.',
      conteudo: '<p>O programa de restauro de acervos históricos do Estado do Acre entrou em uma nova fase, com equipes especializadas iniciando os trabalhos de conservação preventiva nos museus estaduais. O projeto garante a longevidade de peças centenárias que contam a história da região.</p><p>Serão investidos R$ 800 mil em equipamentos e capacitação de profissionais.</p>',
      data_publicacao: new Date(Date.now() - 259200000).toISOString(),
      categoria: 'patrimonio',
      status: 'published',
    },
    {
      titulo: 'Teatro Hélio Melo reabre após revitalização completa',
      resumo: 'A cerimônia de reabertura contou com apresentação da orquestra sinfônica e destacou as novas adequações de acessibilidade do espaço.',
      conteudo: '<p>O Teatro Hélio Melo, um dos mais importantes equipamentos culturais do Acre, reabriu suas portas após uma revitalização completa que durou 18 meses. A cerimônia de reabertura contou com apresentação da Orquestra Sinfônica do Acre e destacou as novas adequações de acessibilidade.</p><p>O espaço agora conta com rampas, elevador, banheiros adaptados e sistema de audiodescrição.</p>',
      data_publicacao: new Date(Date.now() - 345600000).toISOString(),
      categoria: 'institucional',
      status: 'published',
    },
    {
      titulo: 'Oficinas de economia criativa capacitam jovens empreendedores',
      resumo: 'Projeto em parceria com instituições de ensino superior oferece mentoria gratuita para iniciativas no setor cultural.',
      conteudo: '<p>O projeto "Criativa Juventude", parceria entre a FEM e instituições de ensino superior do Acre, oferece mentoria gratuita para jovens empreendedores do setor cultural. As oficinas abrangem áreas como produção audiovisual, artesanato de ponta, marketing digital para artistas e gestão de projetos culturais.</p><p>As inscrições estão abertas até o final do mês.</p>',
      data_publicacao: new Date(Date.now() - 432000000).toISOString(),
      categoria: 'educacao',
      status: 'published',
    },
  ];

  for (const n of noticias) {
    try {
      const existing = await api(`/items/noticias?filter[titulo][_eq]=${encodeURIComponent(n.titulo)}`);
      if (existing.length === 0) {
        await api('/items/noticias', { method: 'POST', body: JSON.stringify(n) });
        console.log(`  ✅ Notícia: ${n.titulo.slice(0, 50)}...`);
      }
    } catch (err: any) {
      console.warn(`  ⚠️ ${err.message}`);
    }
    await delay(300);
  }

  // Eventos adicionais
  const eventos = [
    {
      titulo: 'Festival de Inverno: Orquestra Sinfônica',
      descricao: '<p>Apresentação especial com repertório clássico e regional, celebrando a cultura local em uma noite inesquecível de performances orquestrais sob a luz do luar.</p>',
      data_inicio: new Date(Date.now() + 15 * 86400000).toISOString(),
      data_fim: new Date(Date.now() + 15 * 86400000 + 3 * 3600000).toISOString(),
      local: 'Theatro Hélio Melo',
      categoria: 'musica',
      destaque: true,
      horario: '19:00 - 21:30',
      gratuito: false,
      status: 'published',
    },
    {
      titulo: 'Exposição: Raízes da Amazônia',
      descricao: '<p>Uma jornada visual pelas tradições e lendas da floresta, através das lentes de fotógrafos locais e instalações artísticas imersivas.</p>',
      data_inicio: new Date(Date.now() + 18 * 86400000).toISOString(),
      data_fim: new Date(Date.now() + 25 * 86400000).toISOString(),
      local: 'Museu da Borracha',
      categoria: 'artes_visuais',
      horario: '10:00 - 18:00',
      gratuito: true,
      status: 'published',
    },
    {
      titulo: 'Roda de Leitura: Autores Acrianos',
      descricao: '<p>Encontro mensal para debate e análise de obras contemporâneas de autores do estado do Acre, mediado por professores convidados.</p>',
      data_inicio: new Date(Date.now() + 22 * 86400000).toISOString(),
      data_fim: new Date(Date.now() + 22 * 86400000 + 2 * 3600000).toISOString(),
      local: 'Biblioteca Pública Estadual',
      categoria: 'literatura',
      horario: '16:00 - 18:00',
      gratuito: true,
      status: 'published',
    },
  ];

  for (const e of eventos) {
    try {
      const existing = await api(`/items/eventos?filter[titulo][_eq]=${encodeURIComponent(e.titulo)}`);
      if (existing.length === 0) {
        await api('/items/eventos', { method: 'POST', body: JSON.stringify(e) });
        console.log(`  ✅ Evento: ${e.titulo}`);
      }
    } catch (err: any) {
      console.warn(`  ⚠️ ${err.message}`);
    }
    await delay(300);
  }

  // Espaços culturais adicionais
  const espacos = [
    { nome: 'Museu da Borracha', descricao: 'Museu histórico que conta a história do ciclo da borracha no Acre. Acervo com mais de 3.000 peças.', endereco: 'Av. Getúlio Vargas, 123 - Centro, Rio Branco - AC', horario_funcionamento: 'Ter-Dom: 8h às 18h', categoria: 'museu', status: 'published' },
    { nome: 'Theatro Hélio Melo', descricao: 'Principal teatro do Estado do Acre, palco de grandes espetáculos nacionais e locais. Com capacidade para 800 pessoas.', endereco: 'Rua Benjamin Constant, 100 - Centro', horario_funcionamento: 'Seg-Sex: 8h às 22h', categoria: 'teatro', status: 'published' },
    { nome: 'Biblioteca Pública Estadual', descricao: 'Maior acervo bibliográfico do Acre, com mais de 50 mil títulos. Espaço de leitura, pesquisa e atividades culturais.', endereco: 'Av. Getúlio Vargas, s/n - Centro', horario_funcionamento: 'Seg-Sex: 8h às 20h, Sáb: 9h às 13h', categoria: 'biblioteca', status: 'published' },
    { nome: 'Memorial dos Autonomistas', descricao: 'Espaço de memória dedicado aos líderes do movimento de autonomia do Acre. Documentos históricos e exposição permanente.', endereco: 'Praça Eurico Gaspar Dutra, s/n - Centro', horario_funcionamento: 'Ter-Sáb: 9h às 17h', categoria: 'espaco_memoria', status: 'published' },
    { nome: 'Usina de Arte João Donato', descricao: 'Centro cultural multiuso instalado em antiga usina revitalizada. Galerias, ateliês, salas de aula e auditório para 200 pessoas.', endereco: 'Av. Brasil, 500 - Distrito Industrial', horario_funcionamento: 'Ter-Dom: 10h às 20h', categoria: 'centro_cultural', status: 'published' },
    { nome: 'Casa dos Povos da Floresta', descricao: 'Museu dedicado às culturas indígenas do Acre. Exposições de artefatos, fotografia e artesanato dos povos Huni Kuĩ, Ashaninka e outros.', endereco: 'Parque da Maternidade, s/n - Centro', horario_funcionamento: 'Ter-Sáb: 9h às 17h', categoria: 'museu', status: 'published' },
  ];

  for (const e of espacos) {
    try {
      const existing = await api(`/items/espacos_culturais?filter[nome][_eq]=${encodeURIComponent(e.nome)}`);
      if (existing.length === 0) {
        await api('/items/espacos_culturais', { method: 'POST', body: JSON.stringify(e) });
        console.log(`  ✅ Espaço: ${e.nome}`);
      } else {
        // Atualiza categoria se já existe
        await api(`/items/espacos_culturais/${existing[0].id}`, { method: 'PATCH', body: JSON.stringify({ categoria: e.categoria }) });
        console.log(`  🔄 Espaço atualizado: ${e.nome}`);
      }
    } catch (err: any) {
      console.warn(`  ⚠️ ${err.message}`);
    }
    await delay(300);
  }

  // Mais editais
  const editais = [
    { titulo: 'Fomento à Produção Audiovisual Independente', numero: '04/2024', data_abertura: '2024-05-15', data_encerramento: '2024-06-30', status_label: 'aberto', resumo: 'Seleção de projetos culturais de audiovisual para receberem apoio financeiro, visando o incentivo e fomento da cadeia produtiva local.', status: 'published' },
    { titulo: 'Credenciamento de Pareceristas Culturais', numero: '02/2024', data_abertura: '2024-03-01', data_encerramento: '2025-12-31', status_label: 'aberto', resumo: 'Cadastro de profissionais especializados para atuar nas comissões de análise de mérito dos editais de fomento à cultura.', status: 'published' },
    { titulo: 'Prêmio Culturas Tradicionais e Populares', numero: '01/2024', data_abertura: '2024-01-10', data_encerramento: '2024-04-10', status_label: 'encerrado', resumo: 'Premiação para projetos de culturas tradicionais e populares do estado do Acre.', status: 'published' },
  ];

  for (const e of editais) {
    try {
      const existing = await api(`/items/editais?filter[numero][_eq]=${encodeURIComponent(e.numero)}`);
      if (existing.length === 0) {
        await api('/items/editais', { method: 'POST', body: JSON.stringify(e) });
        console.log(`  ✅ Edital: ${e.numero} - ${e.titulo.slice(0, 50)}`);
      }
    } catch (err: any) {
      console.warn(`  ⚠️ ${err.message}`);
    }
    await delay(300);
  }

  // Atualiza notícias existentes com categoria
  try {
    const allNoticias = await api('/items/noticias?fields=id,titulo,categoria');
    const categorias = ['institucional', 'editais', 'musica', 'patrimonio', 'artes_visuais', 'educacao'];
    for (let i = 0; i < allNoticias.length; i++) {
      if (!allNoticias[i].categoria) {
        await api(`/items/noticias/${allNoticias[i].id}`, {
          method: 'PATCH',
          body: JSON.stringify({ categoria: categorias[i % categorias.length] }),
        });
        console.log(`  🔄 Notícia #${allNoticias[i].id} atualizada com categoria`);
      }
    }
  } catch (err: any) {
    console.warn(`  ⚠️ Erro ao atualizar categorias: ${err.message}`);
  }
}

// ───── 3. Webhook Flow ─────
async function createWebhookFlow() {
  console.log('\n🌐 Criando Webhook Flow no Directus...');
  await delay(500);

  const webhookUrl = process.env.PUBLIC_SITE_URL
    ? `${process.env.PUBLIC_SITE_URL}/api/webhook/rebuild`
    : 'http://localhost:4321/api/webhook/rebuild';

  try {
    // Verifica se o Flow já existe
    const existingFlows = await api('/flows?filter[name][_eq]=Rebuild Frontend');
    if (existingFlows.length > 0) {
      console.log(`  ⚠️ Flow "Rebuild Frontend" já existe (ID: ${existingFlows[0].id}).`);
      console.log(`  📡 Webhook aponta para: ${webhookUrl}`);
      return;
    }

    // Cria o Flow
    const flow = await api('/flows', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Rebuild Frontend',
        icon: 'cached',
        color: '#00450d',
        description: 'Dispara rebuild do frontend Astro quando conteúdo é publicado/atualizado',
        trigger: 'event',
        options: {
          type: 'action',
          scope: ['items.create', 'items.update', 'items.delete'],
          collections: ['noticias', 'eventos', 'editais', 'espacos_culturais', 'paginas_institucionais'],
        },
        status: 'active',
      }),
    });
    console.log(`  ✅ Flow criado (ID: ${flow.id})`);

    // Adiciona o Operation "Webhook"
    const operation = await api('/operations', {
      method: 'POST',
      body: JSON.stringify({
        flow: flow.id,
        name: 'POST para rebuild',
        key: 'send-webhook',
        type: 'request',
        position_x: 20,
        position_y: 20,
        options: {
          url: webhookUrl,
          method: 'POST',
          headers: JSON.stringify({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            collection: '{{$trigger.collection}}',
            event: '{{$trigger.event}}',
            keys: '{{$trigger.keys}}',
          }),
        },
        resolve: '$last',
      }),
    });
    console.log(`  ✅ Operation criada (ID: ${operation.id})`);

    console.log(`  📡 Webhook aponta para: ${webhookUrl}`);
  } catch (err: any) {
    console.warn(`  ⚠️ Erro ao criar Flow: ${err.message}`);
    console.log('  📝 Crie manualmente no painel Directus:');
    console.log('     Settings > Flows > Create Flow');
    console.log('     Trigger: Event > Action (items.create, items.update, items.delete)');
    console.log('     Collections: noticias, eventos, editais, espacos_culturais, paginas_institucionais');
    console.log(`     Operation: Webhook > POST ${webhookUrl}`);
  }
}

async function main() {
  console.log('═══════════════════════════════════════');
  console.log('  Full Setup - Portal FEM');
  console.log('═══════════════════════════════════════\n');

  await login();

  await createStaticToken();

  await seedMoreContent();

  await createWebhookFlow();

  console.log('\n═══════════════════════════════════════');
  console.log('  ✅ Full Setup concluído!');
  console.log('');
  console.log('  📝 Aponte no frontend/.env:');
  console.log(`     PUBLIC_DIRECTUS_TOKEN=${PUBLIC_TOKEN}`);
  console.log('  🔄 Rode: npm run dev');
  console.log('═══════════════════════════════════════');
}

main().catch((err) => {
  console.error('\n❌ Erro:', err.message);
  process.exit(1);
});
