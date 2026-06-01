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

async function addField(collection, field) {
  console.log(`  📋 ${collection}: "${field.field}"...`);
  const result = await api(`/fields/${collection}`, { method: 'POST', body: JSON.stringify(field) });
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

  console.log('📋 Adicionando campos aos eventos...\n');

  await addField('eventos', {
    field: 'pdf_programacao',
    type: 'uuid',
    meta: { interface: 'file', special: ['file'], width: 'full' },
    schema: { is_nullable: true },
  });

  await addField('eventos', {
    field: 'galeria',
    type: 'json',
    meta: { interface: 'list', special: ['json'], width: 'full', options: {
      template: '{{file}}',
      fields: [
        { field: 'file', type: 'uuid', meta: { interface: 'file', special: ['file'] } },
      ],
    }},
    schema: { is_nullable: true },
  });

  console.log('\n🎉 Campos adicionados!');
  console.log('   pdf_programacao: Upload PDF da programação');
  console.log('   galeria: Múltiplas fotos do evento');
}

main().catch(err => { console.error('\n❌', err.message); process.exit(1); });
