const DIRECTUS_URL = process.env.DIRECTUS_URL || 'http://localhost:8055';
const ADMIN_EMAIL = 'admin@femcultura.ac.gov.br';
const ADMIN_PASSWORD = 'F3m_Adm1n_2025_S3gur0';

let token = '';

async function api(endpoint, options = {}) {
  const url = `${DIRECTUS_URL}${endpoint}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { ...options, headers });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = body?.errors?.map(e => e.message).join(', ') || res.statusText;
    throw new Error(`${res.status}: ${msg}`);
  }
  return body?.data ?? body;
}

async function uploadSampleFile(name, content) {
  console.log(`  📄 Enviando ${name}...`);
  const blob = new Blob([content], { type: 'text/plain' });
  const form = new FormData();
  form.append('file', blob, name);
  const res = await fetch(`${DIRECTUS_URL}/files`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: form,
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`${res.status}: ${JSON.stringify(body)}`);
  console.log(`  ✅ ${name} -> ${body.data.id}`);
  return body.data.id;
}

async function main() {
  console.log('🔑 Logando...');
  const auth = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  token = auth.access_token;
  console.log('✅ Logado');

  // Upload files simulados
  const pdfEdital = await uploadSampleFile('edital-005-2025.txt', 
    'Edital nº 005/2025 - Arte e Patrimônio\n\n' +
    'A Fundação de Cultura Elias Mansour (FEM) torna público o presente Edital de chamamento para seleção de projetos culturais.\n\n' +
    '1. DOS OBJETIVOS\n' +
    'O presente edital visa selecionar projetos culturais nas áreas de artes visuais, música e patrimônio cultural.\n\n' +
    '2. DOS RECURSOS\n' +
    'Serão investidos R$ 500.000,00 (quinhentos mil reais).\n\n' +
    '3. DAS INSCRIÇÕES\n' +
    'As inscrições ocorrerão no período de 01/06/2025 a 30/06/2025.\n\n' +
    '4. DOS CRITÉRIOS DE SELEÇÃO\n' +
    'Os projetos serão avaliados por comissão técnica designada pela FEM.'
  );

  const pdfDiario = await uploadSampleFile('diario-oficial-005-2025.txt',
    'DIÁRIO OFICIAL DO ESTADO DO ACRE\n\n' +
    'Publicação: Edital nº 005/2025 - FEM\n' +
    'Data: 15 de maio de 2025\n\n' +
    'Fica publicado o Edital nº 005/2025 da Fundação de Cultura Elias Mansour, conforme Lei Paulo Gustavo.'
  );

  const anexo1 = await uploadSampleFile('anexo-i-cronograma.txt',
    'ANEXO I - CRONOGRAMA\n\n' +
    'Lançamento: 15/05/2025\n' +
    'Inscrições: 01/06 a 30/06/2025\n' +
    'Análise: 01/07 a 31/07/2025\n' +
    'Resultado: 15/08/2025\n' +
    'Contratação: 01/09/2025'
  );

  const anexo2 = await uploadSampleFile('anexo-ii-planilha-orcamentaria.docx',
    'ANEXO II - PLANILHA ORÇAMENTÁRIA (modelo .docx)\n\n' +
    'Tabela de referência para elaboração da proposta financeira.'
  );

  // Buscar categoria existente
  const cats = await api('/items/categorias_editais');
  const catLPG = cats.find(c => c.slug === 'lei-paulo-gustavo');
  const catId = catLPG ? catLPG.id : null;

  // Criar edital completo
  console.log('\n📝 Criando edital completo...');
  const editalData = {
    titulo: 'Edital nº 005/2025 - Arte e Patrimônio',
    numero: '005/2025',
    data_abertura: '2025-06-01',
    data_encerramento: '2025-06-30',
    status_label: 'aberto',
    resumo: 'A Fundação de Cultura Elias Mansour (FEM) lança o Edital nº 005/2025, com recursos da Lei Paulo Gustavo, para selecionar projetos culturais nas áreas de artes visuais, música e patrimônio cultural. Serão investidos R$ 500.000,00 em projetos que valorizem a cultura acreana.',
    link_pdf: null,
    link_inscricao: 'https://forms.google.com/inscricao-edital-005-2025',
    pdf_edital: pdfEdital,
    pdf_diario_oficial: pdfDiario,
    anexos: [
      { nome: 'Anexo I - Cronograma', arquivo: anexo1 },
      { nome: 'Anexo II - Planilha Orçamentária', arquivo: anexo2 },
    ],
    categoria: catId,
    status: 'published',
  };

  // Deletar edital existente com mesmo título
  try {
    const existing = await api('/items/editais?filter[titulo][_eq]=Edital nº 005/2025 - Arte e Patrimônio');
    if (existing.length > 0) {
      console.log('  🗑️ Removendo edital antigo...');
      await api(`/items/editais/${existing[0].id}`, { method: 'DELETE' });
    }
  } catch (_) {}

  const created = await api('/items/editais', {
    method: 'POST',
    body: JSON.stringify(editalData),
  });
  console.log(`  ✅ Edital criado! ID: ${created.id}`);

  console.log('\n🎉 Pronto! Acesse:');
  console.log(`   http://localhost:4321/editais/${created.id}`);
  console.log(`   http://localhost:8055/admin/content/editais/${created.id}`);
}

main().catch(err => {
  console.error('\n❌ Erro:', err.message);
  process.exit(1);
});
