import { createDirectus, rest, readItems, createItem, staticToken } from '@directus/sdk';
import type { Schema, EspacoCultural } from '../schemas/directus';

// Load environment variables
import { config } from 'dotenv';
config({ path: '../.env' });

const DIRECTUS_URL = process.env.PUBLIC_DIRECTUS_URL || 'http://localhost:8055';
const DIRECTUS_TOKEN = process.env.PUBLIC_DIRECTUS_TOKEN || '';
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';

if (!GOOGLE_MAPS_API_KEY) {
  console.error('GOOGLE_MAPS_API_KEY environment variable is required for geocoding');
  process.exit(1);
}

const directus = createDirectus<Schema>(DIRECTUS_URL)
  .with(staticToken(DIRECTUS_TOKEN))
  .with(rest());

// Helper function to slugify a string
function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove non-alphanumeric, spaces, or hyphens
    .replace(/[\s_-]+/g, '-') // Replace spaces, underscores, or hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading or trailing hyphens
}

// Helper function to get horario based on tipo
function getHorario(tipo: EspacoCultural['categoria']): string {
  switch (tipo) {
    case 'biblioteca':
      return 'Segunda a Sexta, 8h às 17h';
    case 'museu':
      return 'Terça a Domingo, 9h às 18h';
    case 'teatro':
      return 'Conforme programação';
    case 'centro_cultural':
      return 'Terça a Domingo, 10h às 20h';
    case 'espaco_memoria':
      return 'Segunda a Sexta, 8h às 17h'; // Assuming similar to biblioteca
    default:
      return 'Segunda a Sexta, 8h às 17h';
  }
}

// Helper function to get description based on tipo
function getDescricao(tipo: EspacoCultural['categoria'], nome: string): string {
  const tipoMap: Record<EspacoCultural['categoria'], string> = {
    biblioteca: 'Biblioteca pública oferecendo acesso a livros, periódicos e recursos digitais para a comunidade.',
    museu: 'Museu dedicado à preservação e exposição do patrimônio histórico e cultural.',
    teatro: 'Teatro para apresentações de artes cênicas, incluindo teatro, dança e música.',
    centro_cultural: 'Centro cultural oferecendo diversas atividades artístico-culturais para a comunidade.',
    espaco_memoria: 'Espaço de memória dedicado à preservação da história e identidade local.',
  };
  return tipoMap[tipo] || 'Espaço cultural dedicado à promoção de atividades artístico-culturais.';
}

// Geocoding function using Google Maps API
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const encodedAddress = encodeURIComponent(address);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${GOOGLE_MAPS_API_KEY}&language=pt-BR`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`);
    }
    const data = await response.json();
    if (data.status === 'OK' && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return { lat: location.lat, lng: location.lng };
    } else {
      console.warn(`Geocoding failed for address "${address}": ${data.status}`);
      return null;
    }
  } catch (error) {
    console.error(`Error geocoding address "${address}":`, error);
    return null;
  }
}

// Espaços culturais data
const espacosData = [
  { municipio: 'Epitaciolândia', nome: 'Biblioteca Pública Eliomar De Souza', endereco: 'Rua Capitão Pedro Vasconcelos, 175', tipo: 'biblioteca' },
  { municipio: 'Rio Branco', nome: 'Biblioteca Pública Estadual Adonay Barbosa', endereco: 'Av. Getúlio Vargas, 389 – Centro', tipo: 'biblioteca' },
  { municipio: 'Rio Branco', nome: 'Biblioteca Pública Estadual Da Floresta', endereco: 'Via Parque Da Maternidade, S/N - Capoeira', tipo: 'biblioteca' },
  { municipio: 'Rio Branco', nome: 'Museu Dos Povos Acreanos', endereco: 'Av. Epaminondas Jácome, 2700 - Centro', tipo: 'museu' },
  { municipio: 'Rio Branco', nome: 'FEM – Casa da Cultura Arte Viva', endereco: 'Rua 17 De Novembro, 1291, 6 De Agosto', tipo: 'centro_cultural' },
  { municipio: 'Cruzeiro Do Sul', nome: 'Biblioteca Pública Padre Trindade', endereco: 'Av. Rodrigues Alves, No 443, Centro', tipo: 'biblioteca' },
  { municipio: 'Taraucá', nome: 'Biblioteca Pública Estadual Ancelmo Lessa', endereco: 'Rua Coronel Juvêncio De Menezes, 301 - Centro', tipo: 'biblioteca' },
  { municipio: 'Xapuri', nome: 'Museu De Xapuri', endereco: 'Rua Coronel Brandão, 160/ Centro', tipo: 'museu' },
  { municipio: 'Rio Branco', nome: 'Museu Da Borracha', endereco: 'Av. Ceará, 1441 – Bairro Centro', tipo: 'museu' },
  { municipio: 'Rio Branco', nome: 'Casa De Leitura Chico Mendes', endereco: 'Rua Gregório Filho, 80 – Bairro Chico Mendes', tipo: 'biblioteca' },
  { municipio: 'Rio Branco', nome: 'Tentamen', endereco: 'Rua 24 De Janeiro, 269 – Bairro 6 De Agosto', tipo: 'centro_cultural' },
  { municipio: 'Rio Branco', nome: 'Teatro Plácido De Castro', endereco: 'Av. Getúlio Vargas, 2703 - Bosque', tipo: 'teatro' },
  { municipio: 'Rio Branco', nome: 'Memorial Dos Autonomistas', endereco: 'Av. Getúlio Vargas, 309 – Centro', tipo: 'espaco_memoria' },
  { municipio: 'Rio Branco', nome: 'Teatro Hélio Melo', endereco: 'Av. Getúlio Vargas, 309 – Centro', tipo: 'teatro' },
  { municipio: 'Rio Branco', nome: 'Cine Teatro Recreio', endereco: 'R. Sen. Eduardo Assmar - 6 de Agosto', tipo: 'teatro' },
  { municipio: 'Rio Branco', nome: 'Usina De Artes João Donato', endereco: 'Av. Parque Das Acácias, 1.155 – Zona B, Setor 4', tipo: 'centro_cultural' },
  { municipio: 'Rio Branco', nome: 'Biblioteca Pública Estadual João Donato', endereco: 'Av. Parque Das Acácias, 1.155 – Zona B, Setor 4', tipo: 'biblioteca' },
  { municipio: 'Rio Branco', nome: 'Teatro Barracão Matias', endereco: 'Estrada Da Sobral, 425 – Sobral', tipo: 'teatro' },
  { municipio: 'Rio Branco', nome: 'Biblioteca Pública Estadual Vó Nazaré', endereco: 'Estrada Da Sobral, 425 – Sobral', tipo: 'biblioteca' },
  { municipio: 'Rio Branco', nome: 'Casarão', endereco: 'Av. Brasil N° 310 - Centro', tipo: 'centro_cultural' },
  { municipio: 'Rio Branco', nome: 'Centro de Formação Cultural', endereco: 'Via Parque - Bosque, Rio Branco - AC', tipo: 'centro_cultural' },
  { municipio: 'Rio Branco', nome: 'Casa Cultural Canal Das Artes', endereco: 'R. Granada, 50 - Conj - 4 1', tipo: 'centro_cultural' },
  { municipio: 'Cruzeiro Do Sul', nome: 'Teatro Dos Náuas', endereco: 'Rua Antônio Costeira, S/N – Bairro João Alves', tipo: 'teatro' },
  { municipio: 'Cruzeiro Do Sul', nome: 'Museu E Memorial José Augusto', endereco: 'Av. Desembargador Távora, Lotes 14 E 15 – Quadra', tipo: 'museu' },
  { municipio: 'Cruzeiro Do Sul', nome: 'Salão Cordélia Lima', endereco: 'Rua do Purus nº 424, João Alves', tipo: 'centro_cultural' },
  { municipio: 'Feijó', nome: 'Casa De Leitura', endereco: 'Avenida Castelo Branco – Parque Buritizal', tipo: 'biblioteca' },
];

async function main() {
  console.log(`Starting import of ${espacosData.length} espaços culturais...`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (const [index, item] of espacosData.entries()) {
    console.log(`[${index + 1}/${espacosData.length}] Processing: ${item.nome}`);
    
    try {
      // Geocode the address
      const coordinates = await geocodeAddress(item.endereco);
      
      // Prepare the data for Directus
      const espacoData: Partial<EspacoCultural> = {
        nome: item.nome,
        slug: slugify(item.nome),
        categoria: item.tipo as EspacoCultural['categoria'],
        descricao: getDescricao(item.tipo as EspacoCultural['categoria'], item.nome),
        endereco: item.endereco,
        latitude: coordinates?.lat ?? null,
        longitude: coordinates?.lng ?? null,
        horario_funcionamento: getHorario(item.tipo as EspacoCultural['categoria']),
        status: 'published',
      };
      
      // Create the item in Directus
      const createdItem = await directus.request(
        createItem('espacos_culturais', espacoData)
      );
      
      console.log(`  ✓ Created with ID: ${createdItem.id}`);
      if (coordinates) {
        console.log(`    Location: ${coordinates.lat}, ${coordinates.lng}`);
      } else {
        console.log(`    Location: NOT FOUND (geocoding failed)`);
      }
      
      successCount++;
    } catch (error) {
      console.error(`  ✗ Failed to create ${item.nome}:`, error);
      failCount++;
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log(`\nImport completed:`);
  console.log(`  Successful: ${successCount}`);
  console.log(`  Failed: ${failCount}`);
  
  if (failCount > 0) {
    process.exit(1);
  }
}

main().catch(console.error);