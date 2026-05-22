import { createDirectus, rest, authentication, createItem } from '@directus/sdk';

const DIRECTUS_URL = process.env.DIRECTUS_URL || 'http://localhost:8055';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@femcultura.ac.gov.br';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

interface Schema {}

async function setupPolicies() {
  const client = createDirectus<Schema>(DIRECTUS_URL)
    .with(authentication())
    .with(rest());

  await client.login({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  console.log('✅ Logado como admin');

  const policies = [
    {
      name: 'Jornalismo (Comunicação)',
      description: 'Pode gerenciar notícias e eventos',
      icon: 'campaign',
      admin_access: false,
      app_access: true,
    },
    {
      name: 'Editais (Fomento)',
      description: 'Pode gerenciar editais, chamamentos e resultados',
      icon: 'description',
      admin_access: false,
      app_access: true,
    },
    {
      name: 'Leitor Público (API)',
      description: 'Acesso de leitura via API para o frontend',
      icon: 'visibility',
      admin_access: false,
      app_access: false,
    },
  ];

  for (const policy of policies) {
    const result = await client.request(
      createItem('policies', policy)
    );
    console.log(`  ✅ Policy criada: ${policy.name} (ID: ${result.id})`);
  }

  console.log('\n🎯 Policies criadas com sucesso!');
  console.log('Acesse o painel Admin > Settings > Policies para configurar as permissões.');
}

setupPolicies().catch(console.error);
