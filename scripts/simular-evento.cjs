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

async function uploadSampleFile(name, content, type = 'text/plain') {
  console.log(`  📄 Enviando ${name}...`);
  const blob = new Blob([content], { type });
  const form = new FormData();
  form.append('file', blob, name);
  const res = await fetch(`${DIRECTUS_URL}/files`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
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

  // Upload files
  const programacao = await uploadSampleFile('programacao-festival-2025.pdf',
    'PROGRAMAÇÃO - Festival de Cultura Acreana 2025\n\n' +
    'Dia 1 (15/07) - Abertura\n' +
    '  19:00 - Apresentação do Grupo de Dança Afro\n' +
    '  20:30 - Show Musical: Banda Regional\n\n' +
    'Dia 2 (16/07) - Mostra de Cinema\n' +
    '  14:00 - Documentário "Acre em Movimento"\n' +
    '  19:00 - Roda de Conversa com Cineastas\n\n' +
    'Dia 3 (17/07) - Encerramento\n' +
    '  18:00 - Feira de Artesanato\n' +
    '  20:00 - Show de Encerramento'
  );

  const foto1 = await uploadSampleFile('foto-evento-1.txt', 'Foto 1 do evento', 'text/plain');
  const foto2 = await uploadSampleFile('foto-evento-2.txt', 'Foto 2 do evento', 'text/plain');
  const foto3 = await uploadSampleFile('foto-evento-3.txt', 'Foto 3 do evento', 'text/plain');
  const foto4 = await uploadSampleFile('foto-evento-4.txt', 'Foto 4 do evento', 'text/plain');

  const agora = new Date();
  const daqui15 = new Date(agora.getTime() + 15 * 86400000);
  const daqui17 = new Date(agora.getTime() + 17 * 86400000);

  // Deletar evento simulado antigo
  try {
    const existing = await api('/items/eventos?filter[titulo][_eq]=Festival de Cultura Acreana 2025');
    if (existing.length > 0) {
      console.log('  🗑️ Removendo evento antigo...');
      await api(`/items/eventos/${existing[0].id}`, { method: 'DELETE' });
    }
  } catch (_) {}

  console.log('\n📝 Criando evento completo...');
  const evento = await api('/items/eventos', {
    method: 'POST',
    body: JSON.stringify({
      titulo: 'Festival de Cultura Acreana 2025',
      descricao: '<p>O <strong>Festival de Cultura Acreana</strong> chega à sua 5ª edição reunindo arte, música, dança, cinema e gastronomia em três dias de programação intensa.</p><p>O evento acontece no Centro de Convenções de Rio Branco e conta com atrações de todas as regionais do estado. A entrada é gratuita!</p><h3>Destaques da Programação</h3><ul><li>Shows musicais com artistas locais e nacionais</li><li>Mostra de cinema acreano</li><li>Feira de artesanato e gastronomia típica</li><li>Oficinas de dança, música e artes visuais</li><li>Rodas de conversa sobre políticas culturais</li></ul>',
      data_inicio: daqui15.toISOString(),
      data_fim: daqui17.toISOString(),
      local: 'Centro de Convenções de Rio Branco - Av. Ceará, 1234',
      link_inscricao: 'https://forms.google.com/inscricao-festival-2025',
      categoria: 'musica',
      destaque: true,
      horario: '14:00 — 22:00',
      gratuito: true,
      pdf_programacao: programacao,
      galeria: [{ file: foto1 }, { file: foto2 }, { file: foto3 }, { file: foto4 }],
      status: 'published',
    }),
  });
  console.log(`  ✅ Evento criado! ID: ${evento.id}`);

  console.log('\n🎉 Pronto! Acesse:');
  console.log(`   http://localhost:4321/eventos/${evento.id}`);
  console.log(`   http://localhost:8055/admin/content/eventos/${evento.id}`);
}

main().catch(err => {
  console.error('\n❌ Erro:', err.message);
  process.exit(1);
});
