const DIRECTUS_URL = process.env.DIRECTUS_URL || 'http://localhost:8055';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@femcultura.ac.gov.br';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
let token = '';

async function api(endpoint, options = {}) {
  const url = `${DIRECTUS_URL}${endpoint}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { ...options, headers });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = body?.errors?.map(e => e.message).join(', ') || res.statusText;
    console.error(`  ${res.status}: ${msg}`);
    return null;
  }
  return body?.data ?? body;
}

async function addField(field) {
  console.log(`  📋 Adicionando campo "${field.field}"...`);
  const result = await api(`/fields/editais`, { method: 'POST', body: JSON.stringify(field) });
  if (result) console.log(`    ✅ OK`);
}

async function addFieldNoticias(field) {
  console.log(`  📋 Adicionando campo "${field.field}"...`);
  const result = await api(`/fields/noticias`, { method: 'POST', body: JSON.stringify(field) });
  if (result) console.log(`    ✅ OK`);
}

async function main() {
  console.log('🔑 Logando...');
  const auth = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  token = auth.access_token;
  console.log('✅ Logado\n');

  console.log('📋 Adicionando campos à coleção "noticias"...\n');

  await addFieldNoticias({
    field: 'slug',
    type: 'string',
    meta: { interface: 'input', width: 'full', options: { placeholder: 'titulo-da-noticia', slug: true } },
    schema: { is_nullable: true },
  });

  await addFieldNoticias({
    field: 'destaque',
    type: 'boolean',
    meta: { interface: 'boolean', width: 'full' },
    schema: { default_value: false },
  });

  console.log('\n🎉 Campos adicionados!');
  console.log('   slug: URL amigável (ex: "edital-005-2025-aberto")');
  console.log('   destaque: checkbox para escolher notícia no hero');
}

main().catch(err => { console.error('\n❌', err.message); process.exit(1); });
