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

async function main() {
  console.log('🔑 Logando...');
  const auth = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  token = auth.access_token;
  console.log('✅ Logado\n');

  console.log('📋 Adicionando campos à coleção "editais"...\n');

  await addField({
    field: 'link_inscricao',
    type: 'string',
    meta: { interface: 'input', width: 'full', options: { placeholder: 'https://forms.google.com/...' } },
    schema: { is_nullable: true },
  });

  await addField({
    field: 'pdf_edital',
    type: 'uuid',
    meta: { interface: 'file', special: ['file'], width: 'full' },
    schema: { is_nullable: true },
  });

  await addField({
    field: 'pdf_diario_oficial',
    type: 'uuid',
    meta: { interface: 'file', special: ['file'], width: 'full' },
    schema: { is_nullable: true },
  });

  await addField({
    field: 'anexos',
    type: 'json',
    meta: { interface: 'list', special: ['json'], width: 'full', options: {
      template: '{{nome}}',
      fields: [
        { field: 'nome', type: 'string', meta: { interface: 'input', width: 'half' } },
        { field: 'arquivo', type: 'uuid', meta: { interface: 'file', special: ['file'], width: 'half' } },
      ],
    }},
    schema: { is_nullable: true },
  });

  console.log('\n🎉 Campos adicionados!');
  console.log('   Agora rode novamente: node scripts/simular-edital.cjs');
}

main().catch(err => { console.error('\n❌', err.message); process.exit(1); });
